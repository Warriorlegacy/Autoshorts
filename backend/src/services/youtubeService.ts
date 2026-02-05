import { google, youtube_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { query } from '../config/db';

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/youtube/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly'
];

export interface YouTubeVideoMetadata {
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

export interface UploadStatus {
  uploadId: string;
  status: 'pending' | 'completed' | 'failed';
  progress?: number;
  videoId?: string;
  error?: string;
}

class YouTubeService {
  private oauth2Client: any;
  private youtube: youtube_v3.Youtube;

  constructor() {
    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      throw new Error('YouTube OAuth credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2(
      YOUTUBE_CLIENT_ID,
      YOUTUBE_CLIENT_SECRET,
      YOUTUBE_REDIRECT_URI
    );

    this.youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  /**
   * Generate OAuth URL for YouTube authorization
   */
  generateAuthUrl(state: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      include_granted_scopes: true,
      state: state,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return {
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    };
  }

  /**
   * Store tokens in database
   */
  async storeTokens(
    userId: string,
    accessToken: string,
    refreshToken: string | undefined,
    expiryDate: number | undefined
  ): Promise<void> {
    const expiresAt = expiryDate ? new Date(expiryDate).toISOString() : null;
    const tokenExpiresAt = expiresAt; // Alias for compatibility

    // Check if account already exists
    const existing = await query(
      'SELECT id FROM connected_accounts WHERE user_id = ? AND platform = ?',
      [userId, 'youtube']
    );

    if (existing.rows.length > 0) {
      // Update existing account
      await query(
        `UPDATE connected_accounts 
         SET access_token = ?, refresh_token = ?, token_expires_at = ?, is_active = 1, updated_at = datetime('now')
         WHERE user_id = ? AND platform = ?`,
        [accessToken, refreshToken || null, tokenExpiresAt, userId, 'youtube']
      );
    } else {
      // Insert new account
      await query(
        `INSERT INTO connected_accounts (user_id, platform, access_token, refresh_token, token_expires_at, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [userId, 'youtube', accessToken, refreshToken || null, tokenExpiresAt]
      );
    }
  }

  /**
   * Get stored tokens for a user
   */
  async getTokens(userId: string): Promise<{
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
  } | null> {
    const result = await query(
      `SELECT access_token, refresh_token, token_expires_at 
       FROM connected_accounts 
       WHERE user_id = ? AND platform = ? AND is_active = 1`,
      [userId, 'youtube']
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(userId: string): Promise<string> {
    const tokens = await this.getTokens(userId);
    
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    this.oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    // Update tokens in database
    await this.storeTokens(
      userId,
      credentials.access_token,
      credentials.refresh_token || tokens.refresh_token,
      credentials.expiry_date
    );

    return credentials.access_token;
  }

  /**
   * Set credentials for API calls
   */
  async setCredentials(userId: string): Promise<void> {
    let tokens = await this.getTokens(userId);
    
    if (!tokens) {
      throw new Error('YouTube account not connected');
    }

    // Check if token is expired
    const expiresAt = new Date(tokens.token_expires_at);
    const now = new Date();
    
    if (expiresAt <= now) {
      // Token expired, refresh it
      const newAccessToken = await this.refreshAccessToken(userId);
      this.oauth2Client.setCredentials({
        access_token: newAccessToken,
        refresh_token: tokens.refresh_token
      });
    } else {
      this.oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });
    }
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(
    userId: string,
    videoPath: string,
    metadata: YouTubeVideoMetadata
  ): Promise<{ videoId: string; uploadId: string }> {
    await this.setCredentials(userId);

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    const fileSize = fs.statSync(videoPath).size;
    const uploadId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const response = await this.youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: metadata.title,
            description: metadata.description,
            tags: metadata.tags || [],
            categoryId: '22' // People & Blogs
          },
          status: {
            privacyStatus: metadata.privacyStatus || 'private'
          }
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      }, {
        // Upload progress tracking could be added here
        onUploadProgress: (evt: any) => {
          const progress = (evt.bytesRead / fileSize) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
        }
      });

      const videoId = response.data.id;
      
      // Store upload record in database
      await query(
        `INSERT INTO youtube_uploads (user_id, upload_id, video_id, status, title, created_at) 
         VALUES (?, ?, ?, 'completed', ?, datetime('now'))`,
        [userId, uploadId, videoId, metadata.title]
      );

      return {
        videoId: videoId!,
        uploadId
      };
    } catch (error: any) {
      // Store failed upload record
      await query(
        `INSERT INTO youtube_uploads (user_id, upload_id, status, title, error, created_at) 
         VALUES (?, ?, 'failed', ?, ?, datetime('now'))`,
        [userId, uploadId, metadata.title, error.message]
      );

      throw error;
    }
  }

  /**
   * Get upload status
   */
  async getUploadStatus(userId: string, uploadId: string): Promise<UploadStatus | null> {
    const result = await query(
      `SELECT upload_id, video_id, status, error 
       FROM youtube_uploads 
       WHERE user_id = ? AND upload_id = ?`,
      [userId, uploadId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      uploadId: row.upload_id,
      status: row.status,
      videoId: row.video_id,
      error: row.error
    };
  }

  /**
   * Get user's YouTube channel info
   */
  async getChannelInfo(userId: string): Promise<{
    id: string;
    title: string;
    description: string;
    thumbnail: string;
  } | null> {
    await this.setCredentials(userId);

    const response = await this.youtube.channels.list({
      part: ['snippet'],
      mine: true
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      return null;
    }

    return {
      id: channel.id!,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      thumbnail: channel.snippet?.thumbnails?.default?.url || ''
    };
  }

  /**
   * Disconnect YouTube account
   */
  async disconnect(userId: string): Promise<void> {
    await query(
      `UPDATE connected_accounts 
       SET is_active = 0, access_token = NULL, refresh_token = NULL, updated_at = datetime('now')
       WHERE user_id = ? AND platform = ?`,
      [userId, 'youtube']
    );
  }

  /**
   * Check if user has connected YouTube account
   */
  async isConnected(userId: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM connected_accounts 
       WHERE user_id = ? AND platform = ? AND is_active = 1`,
      [userId, 'youtube']
    );

    return result.rows.length > 0;
  }
}

export const youtubeService = new YouTubeService();
export default youtubeService;

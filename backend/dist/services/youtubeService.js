"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../config/db");
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/youtube/callback';
const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
];
class YouTubeService {
    constructor() {
        if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
            throw new Error('YouTube OAuth credentials not configured');
        }
        this.oauth2Client = new googleapis_1.google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI);
        this.youtube = googleapis_1.google.youtube({
            version: 'v3',
            auth: this.oauth2Client
        });
    }
    /**
     * Generate OAuth URL for YouTube authorization
     */
    generateAuthUrl(state) {
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
    async exchangeCode(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date
        };
    }
    /**
     * Store tokens in database
     */
    async storeTokens(userId, accessToken, refreshToken, expiryDate) {
        const expiresAt = expiryDate ? new Date(expiryDate).toISOString() : null;
        const tokenExpiresAt = expiresAt; // Alias for compatibility
        // Check if account already exists
        const existing = await (0, db_1.query)('SELECT id FROM connected_accounts WHERE user_id = ? AND platform = ?', [userId, 'youtube']);
        if (existing.rows.length > 0) {
            // Update existing account
            await (0, db_1.query)(`UPDATE connected_accounts 
         SET access_token = ?, refresh_token = ?, token_expires_at = ?, is_active = 1, updated_at = datetime('now')
         WHERE user_id = ? AND platform = ?`, [accessToken, refreshToken || null, tokenExpiresAt, userId, 'youtube']);
        }
        else {
            // Insert new account
            await (0, db_1.query)(`INSERT INTO connected_accounts (user_id, platform, access_token, refresh_token, token_expires_at, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`, [userId, 'youtube', accessToken, refreshToken || null, tokenExpiresAt]);
        }
    }
    /**
     * Get stored tokens for a user
     */
    async getTokens(userId) {
        const result = await (0, db_1.query)(`SELECT access_token, refresh_token, token_expires_at 
       FROM connected_accounts 
       WHERE user_id = ? AND platform = ? AND is_active = 1`, [userId, 'youtube']);
        if (result.rows.length === 0) {
            return null;
        }
        return result.rows[0];
    }
    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(userId) {
        const tokens = await this.getTokens(userId);
        if (!tokens || !tokens.refresh_token) {
            throw new Error('No refresh token available');
        }
        this.oauth2Client.setCredentials({
            refresh_token: tokens.refresh_token
        });
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        // Update tokens in database
        await this.storeTokens(userId, credentials.access_token, credentials.refresh_token || tokens.refresh_token, credentials.expiry_date);
        return credentials.access_token;
    }
    /**
     * Set credentials for API calls
     */
    async setCredentials(userId) {
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
        }
        else {
            this.oauth2Client.setCredentials({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
            });
        }
    }
    /**
     * Upload video to YouTube
     */
    async uploadVideo(userId, videoPath, metadata) {
        await this.setCredentials(userId);
        if (!fs_1.default.existsSync(videoPath)) {
            throw new Error(`Video file not found: ${videoPath}`);
        }
        const fileSize = fs_1.default.statSync(videoPath).size;
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
                    body: fs_1.default.createReadStream(videoPath)
                }
            }, {
                // Upload progress tracking could be added here
                onUploadProgress: (evt) => {
                    const progress = (evt.bytesRead / fileSize) * 100;
                    console.log(`Upload progress: ${progress.toFixed(2)}%`);
                }
            });
            const videoId = response.data.id;
            // Store upload record in database
            await (0, db_1.query)(`INSERT INTO youtube_uploads (user_id, upload_id, video_id, status, title, created_at) 
         VALUES (?, ?, ?, 'completed', ?, datetime('now'))`, [userId, uploadId, videoId, metadata.title]);
            return {
                videoId: videoId,
                uploadId
            };
        }
        catch (error) {
            // Store failed upload record
            await (0, db_1.query)(`INSERT INTO youtube_uploads (user_id, upload_id, status, title, error, created_at) 
         VALUES (?, ?, 'failed', ?, ?, datetime('now'))`, [userId, uploadId, metadata.title, error.message]);
            throw error;
        }
    }
    /**
     * Get upload status
     */
    async getUploadStatus(userId, uploadId) {
        const result = await (0, db_1.query)(`SELECT upload_id, video_id, status, error 
       FROM youtube_uploads 
       WHERE user_id = ? AND upload_id = ?`, [userId, uploadId]);
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
    async getChannelInfo(userId) {
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
            id: channel.id,
            title: channel.snippet?.title || '',
            description: channel.snippet?.description || '',
            thumbnail: channel.snippet?.thumbnails?.default?.url || ''
        };
    }
    /**
     * Disconnect YouTube account
     */
    async disconnect(userId) {
        await (0, db_1.query)(`UPDATE connected_accounts 
       SET is_active = 0, access_token = NULL, refresh_token = NULL, updated_at = datetime('now')
       WHERE user_id = ? AND platform = ?`, [userId, 'youtube']);
    }
    /**
     * Check if user has connected YouTube account
     */
    async isConnected(userId) {
        const result = await (0, db_1.query)(`SELECT id FROM connected_accounts 
       WHERE user_id = ? AND platform = ? AND is_active = 1`, [userId, 'youtube']);
        return result.rows.length > 0;
    }
}
exports.youtubeService = new YouTubeService();
exports.default = exports.youtubeService;
//# sourceMappingURL=youtubeService.js.map
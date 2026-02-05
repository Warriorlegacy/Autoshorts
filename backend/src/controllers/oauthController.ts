import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';

interface OAuthCallbackRequest {
  code: string;
  state: string;
}

interface YoutubeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface InstagramTokenResponse {
  access_token: string;
  user_id: string;
  token_type: string;
}

interface YoutubeUserResponse {
  id: string;
  snippet?: {
    title?: string;
  };
}

interface InstagramUserResponse {
  id: string;
  username: string;
}

const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_USER_URL = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
const INSTAGRAM_TOKEN_URL = 'https://graph.instagram.com/v18.0/oauth/access_token';
const INSTAGRAM_USER_URL = 'https://graph.instagram.com/me?fields=id,username';

export const youtubeCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as unknown as OAuthCallbackRequest;
    
    // Get user ID from session/state (in production, validate state)
    const userId = (req as any).session?.userId;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/callback/youtube`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json() as any;
      throw new Error(`Failed to exchange code for token: ${errorData.error_description}`);
    }

    const tokenData = (await tokenResponse.json()) as YoutubeTokenResponse;

    // Get user info
    const userResponse = await fetch(YOUTUBE_USER_URL, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch YouTube user information');
    }

    const userData = (await userResponse.json()) as YoutubeUserResponse;
    const youtubeUsername = userData.snippet?.title || userData.id;

    // Store or update connected account in database
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    await query(
      `INSERT INTO connected_accounts (user_id, platform, platform_user_id, platform_username, access_token, refresh_token, token_expires_at, is_active)
       VALUES (?, 'youtube', ?, ?, ?, ?, ?, 1)
       ON CONFLICT(user_id, platform) DO UPDATE SET
         platform_user_id = ?,
         platform_username = ?,
         access_token = ?,
         refresh_token = ?,
         token_expires_at = ?,
         is_active = 1,
         updated_at = NOW()`,
      [
        userId,
        userData.id,
        youtubeUsername,
        tokenData.access_token,
        tokenData.refresh_token || null,
        tokenExpiresAt,
        userData.id,
        youtubeUsername,
        tokenData.access_token,
        tokenData.refresh_token || null,
        tokenExpiresAt,
      ]
    );

    console.log(`YouTube account connected for user ${userId}: ${youtubeUsername}`);

    // Redirect back to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/settings?platform=youtube&connected=true&message=YouTube%20account%20connected%20successfully`
    );

  } catch (error: any) {
    console.error('YouTube OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/settings?platform=youtube&connected=false&error=${encodeURIComponent(error.message)}`
    );
  }
};

export const instagramCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as unknown as OAuthCallbackRequest;
    
    const userId = (req as any).session?.userId;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(INSTAGRAM_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID || '',
        client_secret: process.env.INSTAGRAM_APP_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/callback/instagram`,
        code: code as string,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json() as any;
      throw new Error(`Failed to exchange code for token: ${errorData.error_description}`);
    }

    const tokenData = (await tokenResponse.json()) as InstagramTokenResponse;

    // Get user info
    const userResponse = await fetch(`${INSTAGRAM_USER_URL}&access_token=${tokenData.access_token}`);

    if (!userResponse.ok) {
      throw new Error('Failed to fetch Instagram user information');
    }

    const userData = (await userResponse.json()) as InstagramUserResponse;

    // Store or update connected account in database
    // Note: Instagram tokens typically don't expire, but we'll still store expiry for consistency
    const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

    await query(
      `INSERT INTO connected_accounts (user_id, platform, platform_user_id, platform_username, access_token, token_expires_at, is_active)
       VALUES (?, 'instagram', ?, ?, ?, ?, 1)
       ON CONFLICT(user_id, platform) DO UPDATE SET
         platform_user_id = ?,
         platform_username = ?,
         access_token = ?,
         token_expires_at = ?,
         is_active = 1,
         updated_at = NOW()`,
      [
        userId,
        userData.id,
        userData.username,
        tokenData.access_token,
        tokenExpiresAt,
        userData.id,
        userData.username,
        tokenData.access_token,
        tokenExpiresAt,
      ]
    );

    console.log(`Instagram account connected for user ${userId}: ${userData.username}`);

    // Redirect back to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/settings?platform=instagram&connected=true&message=Instagram%20account%20connected%20successfully`
    );

  } catch (error: any) {
    console.error('Instagram OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/settings?platform=instagram&connected=false&error=${encodeURIComponent(error.message)}`
    );
  }
};

export const disconnectAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { platform } = req.params;
    const userId = req.user?.id;
    
    const validPlatforms = ['youtube', 'instagram'];
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ success: false, message: 'Invalid platform' });
    }

    // Mark the account as inactive instead of deleting
    await query(
      'UPDATE connected_accounts SET is_active = 0, updated_at = NOW() WHERE user_id = ? AND platform = ?',
      [userId, platform]
    );

    console.log(`${platform} account disconnected for user ${userId}`);

    res.status(200).json({
      success: true,
      message: `${platform} account disconnected successfully`
    });

  } catch (error: any) {
    console.error('Disconnect account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account',
      error: error.message
    });
  }
};

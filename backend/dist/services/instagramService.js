"use strict";
/**
 * Instagram/Facebook OAuth and Upload Service
 * Handles OAuth flow, token management, and Instagram Reels uploads
 */
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
// Facebook Graph API Configuration
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';
// OAuth scopes required for Instagram Reels publishing
const INSTAGRAM_SCOPES = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement'
].join(',');
class InstagramService {
    constructor() {
        this.appId = process.env.FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || '';
        this.appSecret = process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '';
        this.redirectUri = process.env.FACEBOOK_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3001/api/instagram/callback';
        if (!this.appId || !this.appSecret) {
            console.warn('WARNING: Facebook App ID or Secret not configured. Instagram OAuth will not work.');
        }
    }
    /**
     * Generate Facebook OAuth URL for Instagram
     */
    getAuthUrl(userId, state) {
        const params = new URLSearchParams({
            client_id: this.appId,
            redirect_uri: this.redirectUri,
            scope: INSTAGRAM_SCOPES,
            response_type: 'code',
            state: state || userId,
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
    }
    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code) {
        const params = new URLSearchParams({
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: this.redirectUri,
            code,
        });
        const response = await fetch(`${FACEBOOK_GRAPH_API}/oauth/access_token?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to exchange code for token: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    }
    /**
     * Exchange short-lived token for long-lived token
     */
    async getLongLivedToken(shortLivedToken) {
        const params = new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: this.appId,
            client_secret: this.appSecret,
            fb_exchange_token: shortLivedToken,
        });
        const response = await fetch(`${FACEBOOK_GRAPH_API}/oauth/access_token?${params.toString()}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get long-lived token: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get Instagram Business Account ID from Facebook Page
     */
    async getInstagramAccountId(accessToken, pageId) {
        const response = await fetch(`${FACEBOOK_GRAPH_API}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get Instagram account: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    }
    /**
     * Get user's Facebook Pages
     */
    async getUserPages(accessToken) {
        const response = await fetch(`${FACEBOOK_GRAPH_API}/me/accounts?access_token=${accessToken}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get user pages: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return data.data || [];
    }
    /**
     * Get Instagram Business Account details
     */
    async getInstagramAccountDetails(instagramAccountId, accessToken) {
        const response = await fetch(`${FACEBOOK_GRAPH_API}/${instagramAccountId}?fields=id,username&access_token=${accessToken}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get Instagram details: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    }
    /**
     * Store Instagram account in database
     */
    async storeAccount(userId, instagramAccountId, username, accessToken, refreshToken, expiresAt) {
        const result = await (0, db_1.query)(`INSERT INTO connected_accounts (user_id, platform, platform_user_id, platform_username, access_token, refresh_token, token_expires_at, is_active)
       VALUES (?, 'instagram', ?, ?, ?, ?, ?, 1)
       ON CONFLICT(user_id, platform) DO UPDATE SET
         platform_user_id = ?,
         platform_username = ?,
         access_token = ?,
         refresh_token = ?,
         token_expires_at = ?,
         is_active = 1,
         updated_at = datetime('now')`, [
            userId,
            instagramAccountId,
            username,
            accessToken,
            refreshToken,
            expiresAt.toISOString(),
            instagramAccountId,
            username,
            accessToken,
            refreshToken,
            expiresAt.toISOString(),
        ]);
        if (result.rowCount === 0) {
            throw new Error('Failed to store Instagram account in database');
        }
    }
    /**
     * Get stored account from database
     */
    async getStoredAccount(userId) {
        const result = await (0, db_1.query)(`SELECT id, user_id, platform, platform_user_id, platform_username, access_token, refresh_token, token_expires_at, is_active
       FROM connected_accounts
       WHERE user_id = ? AND platform = 'instagram' AND is_active = 1`, [userId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
    /**
     * Refresh access token if expired
     */
    async refreshTokenIfNeeded(userId) {
        const account = await this.getStoredAccount(userId);
        if (!account) {
            return null;
        }
        const expiresAt = new Date(account.token_expires_at);
        const now = new Date();
        const bufferTime = 24 * 60 * 60 * 1000; // 24 hours buffer
        // If token expires within 24 hours, refresh it
        if (expiresAt.getTime() - now.getTime() < bufferTime) {
            try {
                // Facebook long-lived tokens can be refreshed by making any API call
                // or by getting a new long-lived token using the existing one
                const newToken = await this.getLongLivedToken(account.access_token);
                const newExpiresAt = new Date(Date.now() + newToken.expires_in * 1000);
                await (0, db_1.query)(`UPDATE connected_accounts 
           SET access_token = ?, token_expires_at = ?, updated_at = datetime('now')
           WHERE user_id = ? AND platform = 'instagram'`, [newToken.access_token, newExpiresAt.toISOString(), userId]);
                return newToken.access_token;
            }
            catch (error) {
                console.error('Failed to refresh Instagram token:', error);
                return null;
            }
        }
        return account.access_token;
    }
    /**
     * Upload Reel to Instagram
     * Uses the Instagram Content Publishing API
     */
    async uploadReel(instagramAccountId, accessToken, videoUrl, caption, hashtags = []) {
        try {
            // Step 1: Create a media container for the reel
            const containerParams = new URLSearchParams({
                media_type: 'REELS',
                video_url: videoUrl,
                caption: caption + (hashtags.length > 0 ? '\n\n' + hashtags.map(h => `#${h}`).join(' ') : ''),
                access_token: accessToken,
                share_to_feed: 'true',
            });
            const containerResponse = await fetch(`${FACEBOOK_GRAPH_API}/${instagramAccountId}/media?${containerParams.toString()}`, { method: 'POST' });
            if (!containerResponse.ok) {
                const errorData = await containerResponse.json();
                throw new Error(`Failed to create reel container: ${errorData.error?.message || containerResponse.statusText}`);
            }
            const containerData = await containerResponse.json();
            const containerId = containerData.id;
            console.log(`Created Instagram reel container: ${containerId}`);
            // Step 2: Publish the reel
            const publishParams = new URLSearchParams({
                creation_id: containerId,
                access_token: accessToken,
            });
            const publishResponse = await fetch(`${FACEBOOK_GRAPH_API}/${instagramAccountId}/media_publish?${publishParams.toString()}`, { method: 'POST' });
            if (!publishResponse.ok) {
                const errorData = await publishResponse.json();
                throw new Error(`Failed to publish reel: ${errorData.error?.message || publishResponse.statusText}`);
            }
            const publishData = await publishResponse.json();
            console.log(`Published Instagram reel: ${publishData.id}`);
            return publishData.id;
        }
        catch (error) {
            console.error('Error uploading reel to Instagram:', error);
            throw new Error(`Failed to upload reel: ${error.message}`);
        }
    }
    /**
     * Check upload status
     */
    async checkUploadStatus(containerId, accessToken) {
        const response = await fetch(`${FACEBOOK_GRAPH_API}/${containerId}?fields=status_code&access_token=${accessToken}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to check upload status: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    }
    /**
     * Wait for reel processing to complete
     */
    async waitForProcessing(containerId, accessToken, maxAttempts = 30, intervalMs = 2000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const status = await this.checkUploadStatus(containerId, accessToken);
            if (status.status === 'finished') {
                return true;
            }
            if (status.status === 'error') {
                throw new Error(`Reel processing failed: ${status.status_code}`);
            }
            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
        throw new Error('Reel processing timeout');
    }
    /**
     * Disconnect Instagram account
     */
    async disconnectAccount(userId) {
        const result = await (0, db_1.query)(`UPDATE connected_accounts 
       SET is_active = 0, updated_at = datetime('now')
       WHERE user_id = ? AND platform = 'instagram'`, [userId]);
        if (result.rowCount === 0) {
            throw new Error('Instagram account not found or already disconnected');
        }
        console.log(`Instagram account disconnected for user ${userId}`);
    }
    /**
     * Validate access token
     */
    async validateToken(accessToken) {
        try {
            const response = await fetch(`${FACEBOOK_GRAPH_API}/debug_token?input_token=${accessToken}&access_token=${this.appId}|${this.appSecret}`);
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            return data.data?.is_valid === true;
        }
        catch (error) {
            console.error('Error validating token:', error);
            return false;
        }
    }
}
exports.default = new InstagramService();
//# sourceMappingURL=instagramService.js.map
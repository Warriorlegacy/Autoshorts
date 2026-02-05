"use strict";
/**
 * Instagram OAuth Routes
 * Handles Instagram/Facebook OAuth flow and Reel uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const instagramService_1 = __importDefault(require("../services/instagramService"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * GET /api/instagram/auth
 * Start Instagram OAuth flow
 */
router.get('/auth', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const authUrl = instagramService_1.default.getAuthUrl(userId);
        res.status(200).json({
            success: true,
            authUrl,
            message: 'Redirect to this URL to authorize Instagram',
        });
    }
    catch (error) {
        console.error('Instagram auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate Instagram auth URL',
            error: error.message,
        });
    }
});
/**
 * GET /api/instagram/callback
 * Instagram OAuth callback
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error: oauthError, error_reason, error_description } = req.query;
        // Handle OAuth errors
        if (oauthError) {
            console.error('Instagram OAuth error:', oauthError, error_reason, error_description);
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/settings?platform=instagram&connected=false&error=${encodeURIComponent(String(error_description || oauthError))}`);
        }
        if (!code) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/settings?platform=instagram&connected=false&error=Missing authorization code`);
        }
        const userId = state;
        if (!userId) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/settings?platform=instagram&connected=false&error=Missing user state`);
        }
        // Step 1: Exchange code for short-lived token
        const tokenResponse = await instagramService_1.default.exchangeCodeForToken(code);
        // Step 2: Exchange for long-lived token
        const longLivedToken = await instagramService_1.default.getLongLivedToken(tokenResponse.access_token);
        // Step 3: Get user's Facebook Pages
        const pages = await instagramService_1.default.getUserPages(longLivedToken.access_token);
        if (pages.length === 0) {
            throw new Error('No Facebook pages found. You need at least one Facebook page connected to an Instagram Business account.');
        }
        // Step 4: Get Instagram Business Account from the first page
        const page = pages[0];
        const instagramAccount = await instagramService_1.default.getInstagramAccountId(longLivedToken.access_token, page.id);
        if (!instagramAccount.instagram_business_account) {
            throw new Error('No Instagram Business Account found connected to your Facebook page. Please connect an Instagram Business account to your Facebook page.');
        }
        const instagramAccountId = instagramAccount.instagram_business_account.id;
        // Step 5: Get Instagram username
        const instagramDetails = await instagramService_1.default.getInstagramAccountDetails(instagramAccountId, longLivedToken.access_token);
        // Step 6: Store account in database
        const expiresAt = new Date(Date.now() + longLivedToken.expires_in * 1000);
        await instagramService_1.default.storeAccount(userId, instagramAccountId, instagramDetails.username, longLivedToken.access_token, null, // Facebook doesn't provide refresh tokens
        expiresAt);
        console.log(`Instagram account connected for user ${userId}: ${instagramDetails.username}`);
        // Redirect back to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/settings?platform=instagram&connected=true&message=Instagram%20account%20connected%20successfully`);
    }
    catch (error) {
        console.error('Instagram OAuth callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/settings?platform=instagram&connected=false&error=${encodeURIComponent(error.message)}`);
    }
});
/**
 * POST /api/instagram/upload
 * Upload a Reel to Instagram
 */
router.post('/upload', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const { videoUrl, caption, hashtags, waitForProcessing = false } = req.body;
        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Video URL is required',
            });
        }
        if (!caption) {
            return res.status(400).json({
                success: false,
                message: 'Caption is required',
            });
        }
        // Refresh token if needed and get account
        const accessToken = await instagramService_1.default.refreshTokenIfNeeded(userId);
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Instagram account not connected or token expired. Please reconnect your Instagram account.',
            });
        }
        // Get stored account details
        const account = await instagramService_1.default.getStoredAccount(userId);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Instagram account not found',
            });
        }
        // Upload the reel
        const reelId = await instagramService_1.default.uploadReel(account.platform_user_id, accessToken, videoUrl, caption, hashtags || []);
        // Optionally wait for processing
        if (waitForProcessing) {
            try {
                await instagramService_1.default.waitForProcessing(reelId, accessToken);
                res.status(200).json({
                    success: true,
                    message: 'Reel uploaded and published successfully',
                    reelId,
                    status: 'published',
                    instagramUrl: `https://instagram.com/reel/${reelId}`,
                });
            }
            catch (processingError) {
                // Reel is uploaded but still processing
                res.status(202).json({
                    success: true,
                    message: 'Reel uploaded successfully, processing in progress',
                    reelId,
                    status: 'processing',
                    warning: processingError.message,
                });
            }
        }
        else {
            // Return immediately with reel ID
            res.status(202).json({
                success: true,
                message: 'Reel upload initiated successfully',
                reelId,
                status: 'processing',
                checkStatusUrl: `/api/instagram/status/${reelId}`,
            });
        }
    }
    catch (error) {
        console.error('Instagram upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload reel to Instagram',
            error: error.message,
        });
    }
});
/**
 * GET /api/instagram/status/:reelId
 * Check upload status of a reel
 */
router.get('/status/:reelId', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { reelId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        if (!reelId) {
            return res.status(400).json({
                success: false,
                message: 'Reel ID is required',
            });
        }
        // Get access token
        const accessToken = await instagramService_1.default.refreshTokenIfNeeded(userId);
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Instagram account not connected or token expired',
            });
        }
        // Check status
        const status = await instagramService_1.default.checkUploadStatus(reelId, accessToken);
        res.status(200).json({
            success: true,
            reelId,
            status: status.status,
            statusCode: status.status_code,
            isReady: status.status === 'finished',
        });
    }
    catch (error) {
        console.error('Instagram status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check reel status',
            error: error.message,
        });
    }
});
/**
 * GET /api/instagram/account
 * Get connected Instagram account info
 */
router.get('/account', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const account = await instagramService_1.default.getStoredAccount(userId);
        if (!account) {
            return res.status(404).json({
                success: false,
                message: 'Instagram account not connected',
            });
        }
        // Validate token
        const isValid = await instagramService_1.default.validateToken(account.access_token);
        res.status(200).json({
            success: true,
            account: {
                id: account.id,
                platformUserId: account.platform_user_id,
                username: account.platform_username,
                isActive: account.is_active === 1,
                tokenExpiresAt: account.token_expires_at,
                tokenValid: isValid,
                connectedAt: account.created_at,
            },
        });
    }
    catch (error) {
        console.error('Instagram account info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get Instagram account info',
            error: error.message,
        });
    }
});
/**
 * DELETE /api/instagram/disconnect
 * Disconnect Instagram account
 */
router.delete('/disconnect', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        await instagramService_1.default.disconnectAccount(userId);
        res.status(200).json({
            success: true,
            message: 'Instagram account disconnected successfully',
        });
    }
    catch (error) {
        console.error('Instagram disconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect Instagram account',
            error: error.message,
        });
    }
});
/**
 * POST /api/instagram/refresh
 * Manually refresh access token
 */
router.post('/refresh', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated',
            });
        }
        const newToken = await instagramService_1.default.refreshTokenIfNeeded(userId);
        if (!newToken) {
            return res.status(401).json({
                success: false,
                message: 'Failed to refresh token. Please reconnect your Instagram account.',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
        });
    }
    catch (error) {
        console.error('Instagram token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token',
            error: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=instagram.js.map
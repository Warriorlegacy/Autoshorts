"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const youtubeService_1 = require("../services/youtubeService");
const authMiddleware_1 = require("../middleware/authMiddleware");
const config_1 = require("../constants/config");
const router = express_1.default.Router();
/**
 * GET /api/youtube/auth
 * Start OAuth flow
 */
router.get('/auth', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Create state parameter with user ID and timestamp for security
        const state = jsonwebtoken_1.default.sign({ userId, timestamp: Date.now() }, config_1.JWT_CONFIG.SECRET, { expiresIn: '10m' });
        const authUrl = youtubeService_1.youtubeService.generateAuthUrl(state);
        res.status(200).json({
            success: true,
            authUrl
        });
    }
    catch (error) {
        console.error('YouTube auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate authentication URL',
            error: error.message
        });
    }
});
/**
 * GET /api/youtube/callback
 * OAuth callback handler
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        if (error) {
            console.error('YouTube OAuth error:', error);
            return res.status(400).json({
                success: false,
                message: 'YouTube authorization failed',
                error: error
            });
        }
        if (!code || !state) {
            return res.status(400).json({
                success: false,
                message: 'Missing authorization code or state'
            });
        }
        // Verify state parameter
        let userId;
        try {
            const decoded = jsonwebtoken_1.default.verify(state, config_1.JWT_CONFIG.SECRET);
            userId = decoded.userId;
        }
        catch (jwtError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired state parameter'
            });
        }
        // Exchange code for tokens
        const tokens = await youtubeService_1.youtubeService.exchangeCode(code);
        if (!tokens.refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'No refresh token received. Please revoke access and try again.'
            });
        }
        // Store tokens in database
        await youtubeService_1.youtubeService.storeTokens(userId, tokens.access_token, tokens.refresh_token, tokens.expiry_date);
        // Get channel info for display
        const channelInfo = await youtubeService_1.youtubeService.getChannelInfo(userId);
        // Return HTML that closes the popup and notifies parent window
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>YouTube Connected</title>
          <script>
            window.onload = function() {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'YOUTUBE_CONNECTED',
                  success: true,
                  channel: ${JSON.stringify(channelInfo)}
                }, '*');
              }
              setTimeout(() => window.close(), 2000);
            };
          </script>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f0f0f0;
            }
            .success {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #28a745; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✓ YouTube Connected!</h1>
            <p>Your YouTube account has been successfully connected.</p>
            <p>You can close this window.</p>
            ${channelInfo ? `<p><strong>Channel:</strong> ${channelInfo.title}</p>` : ''}
          </div>
        </body>
      </html>
    `;
        res.send(html);
    }
    catch (error) {
        console.error('YouTube callback error:', error);
        const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <script>
            window.onload = function() {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'YOUTUBE_CONNECTED',
                  success: false,
                  error: ${JSON.stringify(error.message)}
                }, '*');
              }
              setTimeout(() => window.close(), 3000);
            };
          </script>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f0f0f0;
            }
            .error {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>✗ Connection Failed</h1>
            <p>Failed to connect YouTube account.</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>This window will close automatically.</p>
          </div>
        </body>
      </html>
    `;
        res.status(500).send(html);
    }
});
/**
 * POST /api/youtube/upload
 * Upload video to YouTube
 */
router.post('/upload', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Check if YouTube is connected
        const isConnected = await youtubeService_1.youtubeService.isConnected(userId);
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                message: 'YouTube account not connected. Please connect your YouTube account first.'
            });
        }
        const { videoPath, title, description, tags, privacyStatus } = req.body;
        if (!videoPath || !title) {
            return res.status(400).json({
                success: false,
                message: 'Video path and title are required'
            });
        }
        const metadata = {
            title,
            description: description || '',
            tags: tags || [],
            privacyStatus: privacyStatus || 'private'
        };
        const result = await youtubeService_1.youtubeService.uploadVideo(userId, videoPath, metadata);
        res.status(200).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                uploadId: result.uploadId,
                videoId: result.videoId,
                videoUrl: `https://youtube.com/watch?v=${result.videoId}`
            }
        });
    }
    catch (error) {
        console.error('YouTube upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload video to YouTube',
            error: error.message
        });
    }
});
/**
 * GET /api/youtube/status/:uploadId
 * Check upload status
 */
router.get('/status/:uploadId', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { uploadId } = req.params;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        const status = await youtubeService_1.youtubeService.getUploadStatus(userId, uploadId);
        if (!status) {
            return res.status(404).json({
                success: false,
                message: 'Upload not found'
            });
        }
        res.status(200).json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('Get upload status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get upload status',
            error: error.message
        });
    }
});
/**
 * DELETE /api/youtube/disconnect
 * Disconnect YouTube account
 */
router.delete('/disconnect', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        await youtubeService_1.youtubeService.disconnect(userId);
        res.status(200).json({
            success: true,
            message: 'YouTube account disconnected successfully'
        });
    }
    catch (error) {
        console.error('YouTube disconnect error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disconnect YouTube account',
            error: error.message
        });
    }
});
/**
 * GET /api/youtube/channel
 * Get connected YouTube channel info
 */
router.get('/channel', authMiddleware_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Check if YouTube is connected
        const isConnected = await youtubeService_1.youtubeService.isConnected(userId);
        if (!isConnected) {
            return res.status(400).json({
                success: false,
                message: 'YouTube account not connected'
            });
        }
        const channelInfo = await youtubeService_1.youtubeService.getChannelInfo(userId);
        if (!channelInfo) {
            return res.status(404).json({
                success: false,
                message: 'YouTube channel not found'
            });
        }
        res.status(200).json({
            success: true,
            data: channelInfo
        });
    }
    catch (error) {
        console.error('Get channel info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get YouTube channel info',
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=youtube.js.map
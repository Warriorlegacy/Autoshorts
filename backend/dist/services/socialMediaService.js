"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaService = void 0;
exports.getSocialMediaService = getSocialMediaService;
const youtubeService_1 = require("./youtubeService");
const instagramService_1 = __importDefault(require("./instagramService"));
const db_1 = require("../config/db");
class SocialMediaService {
    async getConnectedAccounts(userId) {
        const accounts = [];
        const youtubeConnected = await youtubeService_1.youtubeService.isConnected(userId);
        if (youtubeConnected) {
            const channelInfo = await youtubeService_1.youtubeService.getChannelInfo(userId);
            accounts.push({
                platform: 'youtube',
                isConnected: true,
                username: channelInfo?.title || 'YouTube Channel',
                displayName: channelInfo?.title || '',
                profileImage: channelInfo?.thumbnail || ''
            });
        }
        else {
            accounts.push({
                platform: 'youtube',
                isConnected: false
            });
        }
        const instagramAccount = await instagramService_1.default.getStoredAccount(userId);
        if (instagramAccount) {
            accounts.push({
                platform: 'instagram',
                isConnected: true,
                username: instagramAccount.username || 'Instagram Account'
            });
        }
        else {
            accounts.push({
                platform: 'instagram',
                isConnected: false
            });
        }
        return accounts;
    }
    async isConnected(userId, platform) {
        switch (platform) {
            case 'youtube':
                return youtubeService_1.youtubeService.isConnected(userId);
            case 'instagram':
                const account = await instagramService_1.default.getStoredAccount(userId);
                return !!account;
            default:
                return false;
        }
    }
    async disconnect(userId, platform) {
        try {
            switch (platform) {
                case 'youtube':
                    await youtubeService_1.youtubeService.disconnect(userId);
                    return true;
                case 'instagram':
                    await instagramService_1.default.disconnectAccount(userId);
                    return true;
                default:
                    return false;
            }
        }
        catch (error) {
            console.error(`Error disconnecting ${platform}:`, error);
            return false;
        }
    }
    async postVideo(video, platforms) {
        const results = [];
        for (const platform of platforms) {
            const result = await this.postToPlatform(video, platform);
            results.push(result);
        }
        return results;
    }
    async postToPlatform(video, platform) {
        try {
            switch (platform) {
                case 'youtube':
                    return await this.postToYouTube(video);
                case 'instagram':
                    return await this.postToInstagram(video);
                default:
                    return {
                        platform,
                        success: false,
                        error: `Unknown platform: ${platform}`
                    };
            }
        }
        catch (error) {
            return {
                platform,
                success: false,
                error: error.message
            };
        }
    }
    async postToYouTube(video) {
        try {
            const isConnected = await youtubeService_1.youtubeService.isConnected(video.userId);
            if (!isConnected) {
                return {
                    platform: 'youtube',
                    success: false,
                    error: 'YouTube account not connected'
                };
            }
            const metadata = {
                title: video.title,
                description: video.description,
                tags: video.hashtags,
                privacyStatus: 'public'
            };
            const result = await youtubeService_1.youtubeService.uploadVideo(video.userId, video.videoPath, metadata);
            await this.logUpload(video.userId, 'youtube', result.videoId, result.uploadId);
            return {
                platform: 'youtube',
                success: true,
                postId: result.videoId,
                postUrl: `https://youtube.com/watch?v=${result.videoId}`
            };
        }
        catch (error) {
            console.error('YouTube post error:', error);
            return {
                platform: 'youtube',
                success: false,
                error: error.message
            };
        }
    }
    async postToInstagram(video) {
        try {
            const account = await instagramService_1.default.getStoredAccount(video.userId);
            if (!account) {
                return {
                    platform: 'instagram',
                    success: false,
                    error: 'Instagram account not connected'
                };
            }
            const fullCaption = `${video.description}\n\n${video.hashtags.map(t => t).join(' ')}`;
            const reelId = await instagramService_1.default.uploadReel(account.platform_user_id, account.access_token, video.videoPath, fullCaption, video.hashtags);
            await this.logUpload(video.userId, 'instagram', reelId);
            return {
                platform: 'instagram',
                success: true,
                postId: reelId,
                postUrl: `https://instagram.com/reel/${reelId}`
            };
        }
        catch (error) {
            console.error('Instagram post error:', error);
            return {
                platform: 'instagram',
                success: false,
                error: error.message
            };
        }
    }
    async logUpload(userId, platform, postId, uploadId) {
        try {
            await (0, db_1.query)(`INSERT INTO social_uploads (user_id, platform, post_id, upload_id, status, created_at)
         VALUES (?, ?, ?, ?, 'success', datetime('now'))`, [userId, platform, postId, uploadId || postId]);
        }
        catch (error) {
            console.error('Error logging upload:', error);
        }
    }
    async getUploadHistory(userId, limit = 20) {
        try {
            const result = await (0, db_1.query)(`SELECT * FROM social_uploads
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`, [userId, limit]);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting upload history:', error);
            return [];
        }
    }
}
exports.SocialMediaService = SocialMediaService;
let socialMediaService = null;
function getSocialMediaService() {
    if (!socialMediaService) {
        socialMediaService = new SocialMediaService();
    }
    return socialMediaService;
}
exports.default = SocialMediaService;
//# sourceMappingURL=socialMediaService.js.map
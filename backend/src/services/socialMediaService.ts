import { youtubeService, YouTubeVideoMetadata } from './youtubeService';
import instagramService from './instagramService';
import { query } from '../config/db';

export type SocialPlatform = 'youtube' | 'instagram';

export interface SocialMediaVideo {
  videoId: string;
  userId: string;
  videoPath: string;
  title: string;
  description: string;
  hashtags: string[];
}

export interface PostResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface AccountInfo {
  platform: SocialPlatform;
  isConnected: boolean;
  username?: string;
  displayName?: string;
  profileImage?: string;
}

export class SocialMediaService {
  async getConnectedAccounts(userId: string): Promise<AccountInfo[]> {
    const accounts: AccountInfo[] = [];

    const youtubeConnected = await youtubeService.isConnected(userId);
    if (youtubeConnected) {
      const channelInfo = await youtubeService.getChannelInfo(userId);
      accounts.push({
        platform: 'youtube',
        isConnected: true,
        username: channelInfo?.title || 'YouTube Channel',
        displayName: channelInfo?.title || '',
        profileImage: channelInfo?.thumbnail || ''
      });
    } else {
      accounts.push({
        platform: 'youtube',
        isConnected: false
      });
    }

    const instagramAccount = await instagramService.getStoredAccount(userId);
    if (instagramAccount) {
      accounts.push({
        platform: 'instagram',
        isConnected: true,
        username: instagramAccount.username || 'Instagram Account'
      });
    } else {
      accounts.push({
        platform: 'instagram',
        isConnected: false
      });
    }

    return accounts;
  }

  async isConnected(userId: string, platform: SocialPlatform): Promise<boolean> {
    switch (platform) {
      case 'youtube':
        return youtubeService.isConnected(userId);
      case 'instagram':
        const account = await instagramService.getStoredAccount(userId);
        return !!account;
      default:
        return false;
    }
  }

  async disconnect(userId: string, platform: SocialPlatform): Promise<boolean> {
    try {
      switch (platform) {
        case 'youtube':
          await youtubeService.disconnect(userId);
          return true;
        case 'instagram':
          await instagramService.disconnectAccount(userId);
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      return false;
    }
  }

  async postVideo(video: SocialMediaVideo, platforms: SocialPlatform[]): Promise<PostResult[]> {
    const results: PostResult[] = [];

    for (const platform of platforms) {
      const result = await this.postToPlatform(video, platform);
      results.push(result);
    }

    return results;
  }

  async postToPlatform(video: SocialMediaVideo, platform: SocialPlatform): Promise<PostResult> {
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
    } catch (error: any) {
      return {
        platform,
        success: false,
        error: error.message
      };
    }
  }

  private async postToYouTube(video: SocialMediaVideo): Promise<PostResult> {
    try {
      const isConnected = await youtubeService.isConnected(video.userId);
      if (!isConnected) {
        return {
          platform: 'youtube',
          success: false,
          error: 'YouTube account not connected'
        };
      }

      const metadata: YouTubeVideoMetadata = {
        title: video.title,
        description: video.description,
        tags: video.hashtags,
        privacyStatus: 'public'
      };

      const result = await youtubeService.uploadVideo(video.userId, video.videoPath, metadata);

      await this.logUpload(video.userId, 'youtube', result.videoId, result.uploadId);

      return {
        platform: 'youtube',
        success: true,
        postId: result.videoId,
        postUrl: `https://youtube.com/watch?v=${result.videoId}`
      };
    } catch (error: any) {
      console.error('YouTube post error:', error);
      return {
        platform: 'youtube',
        success: false,
        error: error.message
      };
    }
  }

  private async postToInstagram(video: SocialMediaVideo): Promise<PostResult> {
    try {
      const account = await instagramService.getStoredAccount(video.userId);
      if (!account) {
        return {
          platform: 'instagram',
          success: false,
          error: 'Instagram account not connected'
        };
      }

      const fullCaption = `${video.description}\n\n${video.hashtags.map(t => t).join(' ')}`;
      const reelId = await instagramService.uploadReel(
        account.platform_user_id,
        account.access_token,
        video.videoPath,
        fullCaption,
        video.hashtags
      );

      await this.logUpload(video.userId, 'instagram', reelId);

      return {
        platform: 'instagram',
        success: true,
        postId: reelId,
        postUrl: `https://instagram.com/reel/${reelId}`
      };
    } catch (error: any) {
      console.error('Instagram post error:', error);
      return {
        platform: 'instagram',
        success: false,
        error: error.message
      };
    }
  }

  private async logUpload(userId: string, platform: string, postId: string, uploadId?: string): Promise<void> {
    try {
      await query(
        `INSERT INTO social_uploads (user_id, platform, post_id, upload_id, status, created_at)
         VALUES (?, ?, ?, ?, 'success', datetime('now'))`,
        [userId, platform, postId, uploadId || postId]
      );
    } catch (error) {
      console.error('Error logging upload:', error);
    }
  }

  async getUploadHistory(userId: string, limit = 20): Promise<any[]> {
    try {
      const result = await query(
        `SELECT * FROM social_uploads
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting upload history:', error);
      return [];
    }
  }
}

let socialMediaService: SocialMediaService | null = null;

export function getSocialMediaService(): SocialMediaService {
  if (!socialMediaService) {
    socialMediaService = new SocialMediaService();
  }
  return socialMediaService;
}

export default SocialMediaService;

import { query } from '../config/db';
import { youtubeService } from './youtubeService';
import instagramService from './instagramService';

interface QueueItem {
  id: string;
  video_id: string;
  user_id: string;
  scheduled_at: string;
  platforms: string[];
  status: string;
  video_url: string;
  title: string;
  caption: string;
  hashtags: string[];
}

export class AutoPostScheduler {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000;

  start() {
    if (this.isRunning) {
      console.log('Auto-post scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Auto-post scheduler started');
    
    this.processQueue();

    this.checkInterval = setInterval(() => {
      this.processQueue();
    }, this.CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Auto-post scheduler stopped');
  }

  async processQueue() {
    try {
      const now = new Date().toISOString();

      const result = await query(
        `SELECT 
          vq.id, vq.video_id, vq.user_id, vq.scheduled_at, vq.platforms, vq.status,
          v.video_url, v.title, v.caption, v.hashtags
        FROM video_queue vq
        JOIN videos v ON vq.video_id = v.id
        WHERE vq.status = 'queued' AND vq.scheduled_at <= ?
        ORDER BY vq.scheduled_at ASC`,
        [now]
      );

      if (result.rows.length === 0) {
        return;
      }

      console.log(`📤 Found ${result.rows.length} videos ready to post`);

      for (const row of result.rows) {
        await this.processQueueItem(row);
      }

    } catch (error: any) {
      console.error('Error processing queue:', error.message);
    }
  }

  private async processQueueItem(row: any) {
    const queueItem: QueueItem = {
      id: row.id,
      video_id: row.video_id,
      user_id: row.user_id,
      scheduled_at: row.scheduled_at,
      platforms: JSON.parse(row.platforms),
      status: row.status,
      video_url: row.video_url,
      title: row.title,
      caption: row.caption,
      hashtags: JSON.parse(row.hashtags || '[]')
    };

    console.log(`📤 Processing queue item ${queueItem.id}: ${queueItem.title}`);

    const results: { platform: string; success: boolean; error?: string }[] = [];

    for (const platform of queueItem.platforms) {
      try {
        let success = false;
        let error: string | undefined;

        if (platform === 'youtube' && queueItem.video_url) {
          success = await this.postToYouTube(queueItem);
        } else if (platform === 'instagram' && queueItem.video_url) {
          success = await this.postToInstagram(queueItem);
        }

        if (!success) {
          error = `Failed to post to ${platform}`;
        }

        results.push({ platform, success, error });

      } catch (err: any) {
        console.error(`Error posting to ${platform}:`, err.message);
        results.push({ platform, success: false, error: err.message });
      }
    }

    const allSuccessful = results.every(r => r.success);
    const newStatus = allSuccessful ? 'posted' : 'failed';
    const errorMessage = allSuccessful ? null : JSON.stringify(results.filter(r => !r.success));

    await query(
      `UPDATE video_queue SET status = ?, updated_at = NOW(), metadata = ? WHERE id = ?`,
      [newStatus, errorMessage, queueItem.id]
    );

    console.log(`✅ Queue item ${queueItem.id} status: ${newStatus}`);
  }

  private async postToYouTube(queueItem: QueueItem): Promise<boolean> {
    try {
      const isConnected = await youtubeService.isConnected(queueItem.user_id);
      if (!isConnected) {
        console.log(`YouTube not connected for user ${queueItem.user_id}`);
        return false;
      }

      const result = await youtubeService.uploadVideo(
        queueItem.user_id,
        queueItem.video_url,
        {
          title: queueItem.title,
          description: queueItem.caption,
          tags: queueItem.hashtags,
          privacyStatus: 'public'
        }
      );

      console.log(`✅ Uploaded to YouTube: ${result.videoId}`);
      return true;

    } catch (error: any) {
      console.error(`YouTube upload error:`, error.message);
      return false;
    }
  }

  private async postToInstagram(queueItem: QueueItem): Promise<boolean> {
    try {
      const account = await instagramService.getStoredAccount(queueItem.user_id);
      if (!account) {
        console.log(`Instagram not connected for user ${queueItem.user_id}`);
        return false;
      }

      const fullCaption = `${queueItem.caption}\n\n${queueItem.hashtags.map(t => t).join(' ')}`;
      
      const reelId = await instagramService.uploadReel(
        account.platform_user_id,
        account.access_token,
        queueItem.video_url,
        fullCaption,
        queueItem.hashtags
      );

      console.log(`✅ Uploaded to Instagram: ${reelId}`);
      return true;

    } catch (error: any) {
      console.error(`Instagram upload error:`, error.message);
      return false;
    }
  }

  async postNow(queueId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await query(
        `SELECT vq.*, v.video_url, v.title, v.caption, v.hashtags
         FROM video_queue vq
         JOIN videos v ON vq.video_id = v.id
         WHERE vq.id = ? AND vq.user_id = ?`,
        [queueId, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'Queue item not found' };
      }

      const row = result.rows[0];
      const queueItem: QueueItem = {
        id: row.id,
        video_id: row.video_id,
        user_id: row.user_id,
        scheduled_at: row.scheduled_at,
        platforms: JSON.parse(row.platforms),
        status: row.status,
        video_url: row.video_url,
        title: row.title,
        caption: row.caption,
        hashtags: JSON.parse(row.hashtags || '[]')
      };

      await this.processQueueItem(row);

      return { success: true, message: 'Video posted to all platforms' };

    } catch (error: any) {
      console.error('Post now error:', error);
      return { success: false, message: error.message };
    }
  }
}

const autoPostScheduler = new AutoPostScheduler();

export default autoPostScheduler;

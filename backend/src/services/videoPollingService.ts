import { query } from '../config/db';
import { getUnifiedVideoService, VideoProvider } from './unifiedVideoService';

const POLLING_INTERVAL_MS = 30000;
const MAX_POLLING_ATTEMPTS = 120;

interface ProcessingVideo {
  videoId: string;
  requestId: string;
  provider: VideoProvider;
  attempts: number;
}

class VideoPollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      console.log('Video polling service already running');
      return;
    }

    this.isRunning = true;
    console.log('🎯 Starting video polling service...');

    this.pollOnce();

    this.intervalId = setInterval(() => {
      this.pollOnce();
    }, POLLING_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Video polling service stopped');
  }

  private async pollOnce(): Promise<void> {
    try {
      const processingVideos = await this.getProcessingVideos();

      if (processingVideos.length === 0) {
        return;
      }

      console.log(`📊 Checking ${processingVideos.length} processing videos...`);

      for (const video of processingVideos) {
        await this.checkVideoStatus(video);
      }
    } catch (error) {
      console.error('Error in video polling:', error);
    }
  }

  private async getProcessingVideos(): Promise<ProcessingVideo[]> {
    try {
      const result = await query(
        `SELECT id, metadata FROM videos
         WHERE status = 'processing'
         AND json_extract(metadata, '$.aiVideoProvider') IS NOT NULL
         AND json_extract(metadata, '$.aiVideoRequestId') IS NOT NULL
         AND (json_extract(metadata, '$.pollingAttempts') IS NULL OR json_extract(metadata, '$.pollingAttempts') < ?)`,
        [MAX_POLLING_ATTEMPTS]
      );

      return result.rows.map((row: any) => {
        const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
        return {
          videoId: row.id,
          requestId: metadata.aiVideoRequestId,
          provider: metadata.aiVideoProvider,
          attempts: metadata.pollingAttempts || 0
        };
      });
    } catch (error) {
      console.error('Error getting processing videos:', error);
      return [];
    }
  }

  private async checkVideoStatus(video: ProcessingVideo): Promise<void> {
    try {
      const service = getUnifiedVideoService();
      const result = await service.checkStatus(video.requestId, video.provider);

      console.log(`📹 Video ${video.videoId}: ${result.status}`);

      if (result.status === 'success') {
        await this.updateVideoSuccess(video.videoId, result);
      } else if (result.status === 'error') {
        await this.updateVideoError(video.videoId, result.error || 'Video generation failed');
      } else {
        await this.incrementAttempts(video);
      }
    } catch (error) {
      console.error(`Error checking status for video ${video.videoId}:`, error);
      this.incrementAttempts(video);
    }
  }

  private async updateVideoSuccess(videoId: string, result: { videoUrl?: string; localPath?: string }): Promise<void> {
    await query(
      `UPDATE videos SET
        status = 'completed',
        video_url = ?,
        metadata = json_set(COALESCE(metadata, '{}'), '$.pollingAttempts', 0),
        updated_at = datetime('now')
       WHERE id = ?`,
      [result.localPath || result.videoUrl || null, videoId]
    );
    console.log(`✅ Video ${videoId} completed!`);
  }

  private async updateVideoError(videoId: string, error: string): Promise<void> {
    await query(
      `UPDATE videos SET
        status = 'failed',
        metadata = json_set(COALESCE(metadata, '{}'), '$.error', ?),
        updated_at = datetime('now')
       WHERE id = ?`,
      [error, videoId]
    );
    console.error(`❌ Video ${videoId} failed: ${error}`);
  }

  private async incrementAttempts(video: ProcessingVideo): Promise<void> {
    const newAttempts = video.attempts + 1;

    if (newAttempts >= MAX_POLLING_ATTEMPTS) {
      await this.updateVideoError(video.videoId, 'Polling timeout - video generation took too long');
      return;
    }

    await query(
      `UPDATE videos SET
        metadata = json_set(COALESCE(metadata, '{}'), '$.pollingAttempts', ?),
        updated_at = datetime('now')
       WHERE id = ?`,
      [newAttempts, video.videoId]
    );
  }
}

const pollingService = new VideoPollingService();

export function startVideoPollingService(): void {
  pollingService.start();
}

export function stopVideoPollingService(): void {
  pollingService.stop();
}

export default pollingService;

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';

export interface VideoScene {
  id: string;
  narration: string;
  textOverlay: string;
  duration: number; // in seconds
  background: {
    type: 'image' | 'video' | 'gradient' | 'color';
    source: string;
  };
}

export class RenderingService {
  /**
   * Render a video based on its ID
   */
  async renderVideo(videoId: string): Promise<void> {
    try {
      console.log(`[Render] Starting render for video ID: ${videoId} (type: ${typeof videoId})`);
      
      // 1. Fetch video data from DB
      const result = await query(
        'SELECT id, scenes, duration, visual_style FROM videos WHERE id = ?',
        [videoId]
      );
      
      console.log(`[Render] Query result: ${result.rows.length} rows found`);
      if (result.rows.length > 0) {
        console.log(`[Render] First row ID: ${result.rows[0].id} (type: ${typeof result.rows[0].id})`);
      }

      if (result.rows.length === 0) {
        throw new Error(`Video not found: ${videoId}`);
      }

      const videoData = result.rows[0];
      
      // Parse scenes if they're stored as JSON string
      let scenes: VideoScene[] = [];
      try {
        scenes = typeof videoData.scenes === 'string' 
          ? JSON.parse(videoData.scenes) 
          : videoData.scenes;
      } catch (e) {
        throw new Error('Invalid scenes data format');
      }

      if (!scenes || scenes.length === 0) {
        throw new Error('No scenes defined for video');
      }

      // Ensure public/renders directory exists
      const rendersDir = path.join(process.cwd(), 'public/renders');
      if (!fs.existsSync(rendersDir)) {
        fs.mkdirSync(rendersDir, { recursive: true });
      }

      const entry = path.join(process.cwd(), 'src/video-engine/index.ts');
      
      console.log(`Starting render for video ${videoId}...`);
      console.log(`Scenes: ${scenes.length}, Duration: ${videoData.duration}s`);

      // 2. Bundle the video-engine
      console.log('Bundling video engine...');
      const bundleLocation = await bundle({
        entryPoint: entry,
      });

      // 3. Select the composition
      console.log('Selecting composition...');
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: 'ShortVideo',
        inputProps: {
          scenes,
          totalDuration: videoData.duration || 60,
        },
      });

      // 4. Set output path
      const outputLocation = path.join(rendersDir, `${videoId}.mp4`);
      console.log(`Output location: ${outputLocation}`);

      // 5. Render the media
      console.log('Rendering video...');
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation,
        inputProps: {
          scenes,
          totalDuration: videoData.duration || 60,
        },
      });

      console.log(`Render complete: ${outputLocation}`);

      // 6. Update DB with video URL
      const videoUrl = `/renders/${videoId}.mp4`;
      const thumbnailUrl = `/renders/${videoId}.jpg`;

      await query(
        "UPDATE videos SET status = ?, video_url = ?, thumbnail_url = ?, updated_at = datetime('now') WHERE id = ?",
        ['completed', videoUrl, thumbnailUrl, videoId]
      );

      console.log(`Video ${videoId} marked as completed in database`);

    } catch (error) {
      console.error(`Error rendering video ${videoId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      try {
        await query(
          "UPDATE videos SET status = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?",
          ['failed', JSON.stringify({ error: errorMessage }), videoId]
        );
      } catch (dbError) {
        console.error(`Failed to update video status in DB: ${dbError}`);
      }
      
      throw error; // Re-throw for caller to handle
    }
  }

  /**
   * Get rendering status
   */
  async getStatus(videoId: string): Promise<{ status: string; videoUrl?: string }> {
    try {
      const result = await query(
        'SELECT status, video_url FROM videos WHERE id = ?',
        [videoId]
      );

      if (result.rows.length === 0) {
        throw new Error('Video not found');
      }

      const video = result.rows[0];
      return {
        status: video.status,
        videoUrl: video.video_url,
      };
    } catch (error) {
      console.error(`Error getting status for video ${videoId}:`, error);
      throw error;
    }
  }
}
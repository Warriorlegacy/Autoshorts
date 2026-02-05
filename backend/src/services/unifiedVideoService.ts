import { getBytezVideoService } from './bytezVideoService';
import { getFalVideoService } from './falVideoService';
import { getReplicateVideoService } from './replicateVideoService';
import { getHeyGenService } from './heygenService';
import { getSkyreelsService } from './skyreelsService';
import { query } from '../config/db';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

export type VideoProvider = 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels';

export interface UnifiedVideoOptions {
  provider: VideoProvider;
  prompt?: string;
  model?: string;
  duration?: number;
  width?: number;
  height?: number;
  negativePrompt?: string;
  seed?: number;
  avatarId?: string;
  avatarImage?: string;
  audioUrl?: string;
}

export interface UnifiedVideoResult {
  success: boolean;
  requestId: string;
  status: 'processing' | 'success' | 'error';
  videoUrl?: string;
  localPath?: string;
  error?: string;
}

export interface VideoProviderInfo {
  id: VideoProvider;
  name: string;
  isAvailable: boolean;
  isTextToVideo: boolean;
  isAvatar: boolean;
}

export class UnifiedVideoService {
  private rendersDir: string;

  constructor() {
    this.rendersDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(this.rendersDir)) {
      fs.mkdirSync(this.rendersDir, { recursive: true });
    }
  }

  async generateVideo(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
    const { provider } = options;

    switch (provider) {
      case 'bytez':
        return this.generateBytez(options);
      case 'fal':
        return this.generateFal(options);
      case 'replicate':
        return this.generateReplicate(options);
      case 'heygen':
        return this.generateHeyGen(options);
      case 'skyreels':
        return this.generateSkyReels(options);
      default:
        return { success: false, requestId: '', status: 'error', error: `Unknown provider: ${provider}` };
    }
  }

  private async generateBytez(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
    const service = getBytezVideoService();
    if (!service.isAvailable()) {
      return { success: false, requestId: '', status: 'error', error: 'Bytez not configured' };
    }

    const result = await service.generateVideo({
      prompt: options.prompt || '',
      model: options.model
    });

    if (result.status === 'success' && result.videoUrl) {
      const localPath = await this.downloadVideo(result.videoUrl, 'bytez');
      return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
    }

    return { success: result.status !== 'error', requestId: result.requestId, status: result.status, error: result.error };
  }

  private async generateFal(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
    const service = getFalVideoService();
    if (!service.isAvailable()) {
      return { success: false, requestId: '', status: 'error', error: 'FAL not configured' };
    }

    const result = await service.generateVideo({
      prompt: options.prompt || '',
      model: options.model,
      duration: options.duration,
      width: options.width,
      height: options.height,
      negativePrompt: options.negativePrompt
    });

    if (result.status === 'success' && result.videoUrl) {
      const localPath = await this.downloadVideo(result.videoUrl, 'fal');
      return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
    }

    return { success: result.status !== 'error', requestId: result.requestId, status: result.status, error: result.error };
  }

  private async generateReplicate(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
    const service = getReplicateVideoService();
    if (!service.isAvailable()) {
      return { success: false, requestId: '', status: 'error', error: 'Replicate not configured' };
    }

    const result = await service.generateVideo({
      prompt: options.prompt || '',
      model: options.model,
      numFrames: options.duration ? Math.floor(options.duration * 8) : 32,
      width: options.width || 480,
      height: options.height || 272
    });

    if (result.status === 'success' && result.videoUrl) {
      const localPath = await this.downloadVideo(result.videoUrl, 'replicate');
      return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
    }

    return { success: result.status !== 'error', requestId: result.requestId, status: result.status, error: result.error };
  }

  private async generateHeyGen(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
    const service = getHeyGenService();
    if (!service.isAvailable()) {
      return { success: false, requestId: '', status: 'error', error: 'HeyGen not configured' };
    }

    const result = await service.generateVideo({
      avatarId: options.avatarId,
      avatarImage: options.avatarImage,
      audioUrl: options.audioUrl || '',
      text: options.prompt
    });

    const status = result.status === 'completed' ? 'success' : result.status;

    if (status === 'success' && result.videoUrl) {
      const localPath = await service.downloadVideo(result.videoUrl, result.videoId);
      return { success: true, requestId: result.videoId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
    }

    return { success: status !== 'error', requestId: result.videoId, status, error: result.error };
  }

  private async generateSkyReels(options: UnifiedVideoOptions): Promise<UnifiedVideoResult> {
    const service = getSkyreelsService();
    if (!service.isAvailable()) {
      return { success: false, requestId: '', status: 'error', error: 'SkyReels not configured' };
    }

    const result = await service.generateVideo({
      avatarImage: options.avatarImage,
      audioUrl: options.audioUrl || '',
      prompt: options.prompt
    });

    if (result.status === 'success') {
      return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, error: result.error };
    }

    let skyStatus: 'processing' | 'success' | 'error' = 'processing';
    if (result.status === 'error' || result.status === 'failed') {
      skyStatus = 'error';
    }
    return { success: result.status !== 'error', requestId: result.requestId, status: skyStatus, error: result.error };
  }

  async checkStatus(requestId: string, provider: VideoProvider): Promise<{
    status: 'processing' | 'success' | 'error';
    videoUrl?: string;
    localPath?: string;
    error?: string;
  }> {
    switch (provider) {
      case 'bytez': {
        const result = await getBytezVideoService().checkStatus(requestId);
        if (result.status === 'success' && result.videoUrl) {
          const localPath = await this.downloadVideo(result.videoUrl, 'bytez');
          return { status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        const bytezStatus = result.status === 'failed' || result.status === 'error' ? 'error' : result.status;
        return { status: bytezStatus, error: result.error };
      }
      case 'fal': {
        const result = await getFalVideoService().checkStatus(requestId);
        if (result.status === 'success' && result.videoUrl) {
          const localPath = await this.downloadVideo(result.videoUrl, 'fal');
          return { status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        const falStatus = result.status === 'failed' || result.status === 'error' ? 'error' : result.status;
        return { status: falStatus, error: result.error };
      }
      case 'replicate': {
        const result = await getReplicateVideoService().checkStatus(requestId);
        if (result.status === 'success' && result.videoUrl) {
          const localPath = await this.downloadVideo(result.videoUrl, 'replicate');
          return { status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        const replStatus = result.status === 'failed' || result.status === 'error' ? 'error' : result.status;
        return { status: replStatus, error: result.error };
      }
      case 'heygen': {
        const result = await getHeyGenService().checkStatus(requestId);
        const heygenStatus = result.data.status === 'completed' ? 'success' : result.data.status === 'failed' ? 'error' : 'processing';
        if (heygenStatus === 'success' && result.data.video_url) {
          const localPath = await getHeyGenService().downloadVideo(result.data.video_url, requestId);
          return { status: heygenStatus, videoUrl: result.data.video_url, localPath: localPath || undefined };
        }
        return { status: heygenStatus, error: result.data.error };
      }
      case 'skyreels': {
        const result = await getSkyreelsService().checkStatus(requestId);
        if (result.status === 'success') {
          const resultData = await getSkyreelsService().getResult(requestId);
          if (resultData.videoList && resultData.videoList.length > 0) {
            const videoUrl = resultData.videoList[0].url;
            const localPath = await this.downloadVideo(videoUrl, 'skyreels');
            return { status: 'success', videoUrl, localPath: localPath || undefined };
          }
        }
        let skyStatus: 'processing' | 'success' | 'error' = 'processing';
        if (result.status === 'error' || result.status === 'failed') {
          skyStatus = 'error';
        } else if (result.status === 'success') {
          skyStatus = 'success';
        }
        return { status: skyStatus, error: result.error };
      }
      default:
        return { status: 'error', error: `Unknown provider: ${provider}` };
    }
  }

  async updateVideoWithResult(videoId: string, result: UnifiedVideoResult): Promise<void> {
    await query(
      `UPDATE videos SET
        status = ?,
        video_url = ?,
        metadata = json_set(COALESCE(metadata, '{}'), '$.aiVideoRequestId', ?),
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        result.status === 'success' ? 'completed' : result.status,
        result.localPath || result.videoUrl || null,
        result.requestId,
        videoId
      ]
    );
  }

  private async downloadVideo(videoUrl: string, provider: string): Promise<string | null> {
    try {
      const filename = `video_${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      const filepath = path.join(this.rendersDir, filename);

      const response = await fetch(videoUrl);
      if (!response.ok) {
        console.error(`Failed to download video: ${response.status}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      await promisify(fs.writeFile)(filepath, Buffer.from(buffer));

      console.log(`💾 Downloaded ${provider} video: ${filename}`);
      return filepath;
    } catch (error) {
      console.error(`Error downloading ${provider} video:`, error);
      return null;
    }
  }

  getAvailableProviders(): VideoProviderInfo[] {
    return [
      { id: 'bytez', name: 'Bytez', isAvailable: getBytezVideoService().isAvailable(), isTextToVideo: true, isAvatar: false },
      { id: 'fal', name: 'FAL AI', isAvailable: getFalVideoService().isAvailable(), isTextToVideo: true, isAvatar: false },
      { id: 'replicate', name: 'Replicate', isAvailable: getReplicateVideoService().isAvailable(), isTextToVideo: true, isAvatar: false },
      { id: 'heygen', name: 'HeyGen', isAvailable: getHeyGenService().isAvailable(), isTextToVideo: false, isAvatar: true },
      { id: 'skyreels', name: 'SkyReels', isAvailable: getSkyreelsService().isAvailable(), isTextToVideo: false, isAvatar: true }
    ];
  }
}

let unifiedService: UnifiedVideoService | null = null;

export function getUnifiedVideoService(): UnifiedVideoService {
  if (!unifiedService) {
    unifiedService = new UnifiedVideoService();
  }
  return unifiedService;
}

export default UnifiedVideoService;

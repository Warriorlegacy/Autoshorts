import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { API_KEYS, SERVICE_URLS } from '../constants/config';

export interface ReplicateVideoOptions {
  prompt: string;
  model?: string;
  numFrames?: number;
  fps?: number;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
}

export const REPLICATE_VIDEO_MODELS = {
  DEFAULT: 'minimax/controlnet-next',
  COGVIDEO: 'THUDM/CogVideo',
  COGVIDEO_9B: 'THUDM/CogVideo:9c3ed42c1c8252e2355895a9c2f6078bfcf4f7963e42a3b5c5a28e7a3e7c7c7c',
  DEFORUM: 'deforum/deforum',
};

export interface ReplicateVideoResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error';
  videoUrl?: string;
  error?: string;
}

export class ReplicateVideoService {
  private apiKey: string;
  private baseUrl: string;
  private rendersDir: string;

  constructor() {
    this.apiKey = API_KEYS.REPLICATE || '';
    this.baseUrl = SERVICE_URLS.REPLICATE_API;
    this.rendersDir = path.join(process.cwd(), 'public', 'renders');
    
    if (!fs.existsSync(this.rendersDir)) {
      fs.mkdirSync(this.rendersDir, { recursive: true });
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_replicate_api_key_here';
  }

  async generateVideo(options: ReplicateVideoOptions): Promise<ReplicateVideoResponse> {
    if (!this.isAvailable()) {
      return {
        requestId: '',
        status: 'error',
        error: 'Replicate API key not configured'
      };
    }

    try {
      console.log(`🎬 Generating video with Replicate (CogVideo): "${options.prompt.substring(0, 50)}..."`);

      const model = options.model || REPLICATE_VIDEO_MODELS.COGVIDEO;
      const versionId = REPLICATE_VIDEO_MODELS.COGVIDEO_9B;

      const requestBody: any = {
        prompt: options.prompt,
        num_frames: options.numFrames || 32,
        fps: options.fps || 8,
        width: options.width || 480,
        height: options.height || 272,
      };

      const response = await fetch(`${this.baseUrl}/models/${model}/versions/${versionId}/predictions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Replicate video API error: ${response.status} - ${error}`);
        return {
          requestId: '',
          status: 'error',
          error: `API error: ${response.status}`
        };
      }

      const data = await response.json() as ReplicatePredictionResponse;

      if (data.status === 'succeeded' && data.output?.video) {
        return {
          requestId: data.id,
          status: 'success',
          videoUrl: data.output.video
        };
      }

      if (data.status === 'processing' || data.status === 'starting') {
        return {
          requestId: data.id,
          status: 'processing',
        };
      }

      if (data.status === 'failed') {
        return {
          requestId: data.id,
          status: 'error',
          error: data.error || 'Video generation failed'
        };
      }

      console.log('Replicate response:', JSON.stringify(data).substring(0, 500));
      return {
        requestId: data.id || `replicate_${Date.now()}`,
        status: 'processing',
      };
    } catch (error: any) {
      console.error('Replicate video generation error:', error);
      return {
        requestId: '',
        status: 'error',
        error: error.message
      };
    }
  }

  async checkStatus(requestId: string): Promise<ReplicateVideoStatusResponse> {
    if (!this.isAvailable()) {
      return {
        requestId,
        status: 'error',
        error: 'Replicate API key not configured'
      };
    }

    try {
      const model = REPLICATE_VIDEO_MODELS.COGVIDEO;
      const versionId = REPLICATE_VIDEO_MODELS.COGVIDEO_9B;

      const response = await fetch(`${this.baseUrl}/models/${model}/versions/${versionId}/predictions/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        return {
          requestId,
          status: 'error',
          error: `Status check failed: ${response.status}`
        };
      }

      const data = await response.json() as ReplicatePredictionResponse;

      let status: 'processing' | 'success' | 'error' | 'failed' = 'processing';
      if (data.status === 'succeeded') status = 'success';
      else if (data.status === 'failed') status = 'error';

      return {
        requestId: data.id,
        status,
        videoUrl: data.output?.video,
        error: data.status === 'failed' ? data.error : undefined
      };
    } catch (error: any) {
      return {
        requestId,
        status: 'error',
        error: error.message
      };
    }
  }

  async cancelPrediction(requestId: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const model = REPLICATE_VIDEO_MODELS.COGVIDEO;
      const versionId = REPLICATE_VIDEO_MODELS.COGVIDEO_9B;

      const response = await fetch(`${this.baseUrl}/models/${model}/versions/${versionId}/predictions/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.ok || response.status === 204;
    } catch (error) {
      console.error('Error cancelling Replicate prediction:', error);
      return false;
    }
  }

  async downloadVideo(videoUrl: string): Promise<string | null> {
    try {
      const filename = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      const filepath = path.join(this.rendersDir, filename);

      const response = await fetch(videoUrl);
      if (!response.ok) {
        console.error(`Failed to download video: ${response.status}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      await promisify(fs.writeFile)(filepath, Buffer.from(buffer));

      console.log(`💾 Downloaded Replicate video: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('Error downloading Replicate video:', error);
      return null;
    }
  }
}

interface ReplicatePredictionResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: {
    video?: string;
    images?: string[];
  };
  error?: string;
}

interface ReplicateVideoStatusResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error' | 'failed';
  videoUrl?: string;
  error?: string;
}

let replicateVideoService: ReplicateVideoService | null = null;

export function getReplicateVideoService(): ReplicateVideoService {
  if (!replicateVideoService) {
    replicateVideoService = new ReplicateVideoService();
  }
  return replicateVideoService;
}

export default ReplicateVideoService;

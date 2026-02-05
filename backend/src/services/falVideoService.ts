import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { API_KEYS, SERVICE_URLS } from '../constants/config';

export interface FalVideoOptions {
  prompt: string;
  model?: string;
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  negativePrompt?: string;
  seed?: number;
}

export const FAL_VIDEO_MODELS = {
  DEFAULT: 'fal-ai/ltx-video',
  LTX_VIDEO: 'fal-ai/ltx-video',
  MOCHI: 'fal-ai/mochi-v1',
};

export interface FalVideoResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error';
  videoUrl?: string;
  error?: string;
}

export interface FalVideoStatusResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number;
}

export class FalVideoService {
  private apiKey: string;
  private baseUrl: string;
  private rendersDir: string;

  constructor() {
    this.apiKey = API_KEYS.FAL || '';
    this.baseUrl = SERVICE_URLS.FAL_API;
    this.rendersDir = path.join(process.cwd(), 'public', 'renders');
    
    if (!fs.existsSync(this.rendersDir)) {
      fs.mkdirSync(this.rendersDir, { recursive: true });
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_fal_api_key_here';
  }

  async generateVideo(options: FalVideoOptions): Promise<FalVideoResponse> {
    if (!this.isAvailable()) {
      return {
        requestId: '',
        status: 'error',
        error: 'FAL API key not configured'
      };
    }

    try {
      const model = options.model || FAL_VIDEO_MODELS.DEFAULT;
      const isMochi = model === FAL_VIDEO_MODELS.MOCHI;

      console.log(`🎬 Generating video with FAL (${isMochi ? 'Mochi' : 'LTX Video'}): "${options.prompt.substring(0, 50)}..."`);

      let requestBody: any;
      let response: Response;

      if (isMochi) {
        // Mochi has a simpler API
        requestBody = {
          prompt: options.prompt,
        };
        response = await fetch(`${this.baseUrl}/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      } else {
        // LTX Video has more parameters
        requestBody = {
          prompt: options.prompt,
          negative_prompt: options.negativePrompt || 'worst quality, low quality, blurry, distorted, bad anatomy, bad proportions',
          num_frames: options.duration ? Math.min(options.duration * 24, 97) : 49,
          fps: options.fps || 24,
          width: options.width || 768,
          height: options.height || 512,
          seed: options.seed || Math.floor(Math.random() * 2147483647),
          guidance_scale: 3.5,
          motion_bucket_id: 127,
        };
        response = await fetch(`${this.baseUrl}/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
      }

      if (!response.ok) {
        const error = await response.text();
        console.error(`FAL video API error: ${response.status} - ${error}`);
        return {
          requestId: '',
          status: 'error',
          error: `API error: ${response.status}`
        };
      }

      const data = await response.json() as FalVideoApiResponse;

      if (data.request_id) {
        if (data.output?.video) {
          return {
            requestId: data.request_id,
            status: 'success',
            videoUrl: data.output.video
          };
        }

        return {
          requestId: data.request_id,
          status: 'processing',
        };
      }

      if (data.output?.video) {
        return {
          requestId: `fal_${Date.now()}`,
          status: 'success',
          videoUrl: data.output.video
        };
      }

      console.log('FAL response:', JSON.stringify(data).substring(0, 500));
      return {
        requestId: `fal_${Date.now()}`,
        status: 'processing',
      };
    } catch (error: any) {
      console.error('FAL video generation error:', error);
      return {
        requestId: '',
        status: 'error',
        error: error.message
      };
    }
  }

  async checkStatus(requestId: string): Promise<FalVideoStatusResponse> {
    if (!this.isAvailable()) {
      return {
        requestId,
        status: 'error',
        error: 'FAL API key not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}`, {
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

      const data = await response.json() as FalStatusApiResponse;

      let status: 'processing' | 'success' | 'error' | 'failed' = 'processing';
      if (data.status === 'completed') status = 'success';
      else if (data.status === 'failed') status = 'error';

      return {
        requestId: data.request_id,
        status,
        videoUrl: data.output?.video,
        progress: data.progress,
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

      console.log(`💾 Downloaded FAL video: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('Error downloading FAL video:', error);
      return null;
    }
  }
}

interface FalVideoApiResponse {
  request_id?: string;
  status?: string;
  output?: {
    video?: string;
    images?: string[];
  };
  error?: string;
}

interface FalStatusApiResponse {
  request_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  output?: {
    video?: string;
    images?: string[];
  };
  progress?: number;
  error?: string;
}

let falVideoService: FalVideoService | null = null;

export function getFalVideoService(): FalVideoService {
  if (!falVideoService) {
    falVideoService = new FalVideoService();
  }
  return falVideoService;
}

export default FalVideoService;

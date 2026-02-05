import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import https from 'https';
import { API_KEYS, SERVICE_URLS } from '../constants/config';

export interface BytezVideoOptions {
  prompt: string;
  model?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export const BYTEZ_VIDEO_MODELS = {
  DEFAULT: 'ali-vilab/text-to-video-ms-1.7b',
  ZEROSCOPE: 'cerspense/zeroscope_v2_576w',
  WAN: 'wan/v2.6/text-to-video',
};

export interface BytezVideoResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error';
  videoUrl?: string;
  error?: string;
}

export interface BytezVideoStatusResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error' | 'failed';
  videoUrl?: string;
  error?: string;
}

export class BytezVideoService {
  private apiKey: string;
  private baseUrl: string;
  private rendersDir: string;

  constructor() {
    this.apiKey = API_KEYS.BYTEZ || '';
    this.baseUrl = SERVICE_URLS.BYTEZ_API;
    this.rendersDir = path.join(process.cwd(), 'public', 'renders');
    
    if (!fs.existsSync(this.rendersDir)) {
      fs.mkdirSync(this.rendersDir, { recursive: true });
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_bytez_api_key_here';
  }

  async generateVideo(options: BytezVideoOptions): Promise<BytezVideoResponse> {
    if (!this.isAvailable()) {
      return {
        requestId: '',
        status: 'error',
        error: 'Bytez API key not configured'
      };
    }

    try {
      console.log(`🎬 Generating video with Bytez: "${options.prompt.substring(0, 50)}..."`);

      const model = options.model || BYTEZ_VIDEO_MODELS.DEFAULT;
      const isZeroScope = model.includes('zeroscope');

      const requestBody: any = isZeroScope
        ? {
            text: options.prompt,
            num_frames: 24,
            fps: 8,
          }
        : {
            text: options.prompt,
            width: options.width || 576,
            height: options.height || 320,
          };

      const response = await fetch(`${this.baseUrl}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Bytez video API error: ${response.status} - ${error}`);
        return {
          requestId: '',
          status: 'error',
          error: `API error: ${response.status}`
        };
      }

      const data = await response.json() as BytezVideoApiResponse;

      const requestId = data.id || `bytez_${Date.now()}`;
      
      // Handle direct URL in output (Bytez returns URL directly)
      if (typeof data.output === 'string' && data.output.startsWith('http')) {
        return {
          requestId,
          status: 'success',
          videoUrl: data.output
        };
      }
      
      // Handle object format with video_url
      if (typeof data.output === 'object' && data.output !== null && 'video_url' in data.output && data.output.video_url) {
        return {
          requestId,
          status: 'success',
          videoUrl: data.output.video_url
        };
      }

      // Handle object format with video
      if (typeof data.output === 'object' && data.output !== null && 'video' in data.output && data.output.video) {
        return {
          requestId,
          status: 'success',
          videoUrl: data.output.video
        };
      }

      console.log('Bytez response:', JSON.stringify(data).substring(0, 500));
      return {
        requestId,
        status: 'processing',
      };
    } catch (error: any) {
      console.error('Bytez video generation error:', error);
      return {
        requestId: '',
        status: 'error',
        error: error.message
      };
    }
  }

  async checkStatus(requestId: string): Promise<BytezVideoStatusResponse> {
    if (!this.isAvailable()) {
      return {
        requestId,
        status: 'error',
        error: 'Bytez API key not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}`, {
        headers: {
          'Authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        return {
          requestId,
          status: 'error',
          error: `Status check failed: ${response.status}`
        };
      }

      const data = await response.json() as BytezVideoStatusApiResponse;

      return {
        requestId,
        status: data.status === 'succeeded' ? 'success' : 
                data.status === 'failed' ? 'error' : 'processing',
        videoUrl: data.output?.video_url || data.output?.video
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

      console.log(`💾 Downloaded Bytez video: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('Error downloading Bytez video:', error);
      return null;
    }
  }
}

interface BytezVideoApiResponse {
  id?: string;
  status?: string;
  output?: {
    video_url?: string;
    video?: string;
  } | string;
  error?: string;
}

interface BytezVideoStatusApiResponse {
  id: string;
  status: string;
  output?: {
    video_url?: string;
    video?: string;
  };
  error?: string;
}

let bytezVideoService: BytezVideoService | null = null;

export function getBytezVideoService(): BytezVideoService {
  if (!bytezVideoService) {
    bytezVideoService = new BytezVideoService();
  }
  return bytezVideoService;
}

export default BytezVideoService;

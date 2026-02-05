import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { API_KEYS, SERVICE_URLS } from '../constants/config';

export interface RunwayMLOptions {
  prompt: string;
  model?: string;
  duration?: number;
  width?: number;
  height?: number;
  negativePrompt?: string;
  seed?: number;
}

export const RUNWAYML_MODELS = {
  GEN3_ALPHA: 'gen3_alpha',
  GEN3_ALPHA_TURBO: 'gen3_alpha_turbo',
};

export interface RunwayMLResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error';
  videoUrl?: string;
  error?: string;
}

export interface RunwayMLStatusResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error' | 'failed';
  videoUrl?: string;
  error?: string;
  progress?: number;
}

export class RunwayMLService {
  private apiKey: string;
  private baseUrl: string;
  private rendersDir: string;

  constructor() {
    this.apiKey = API_KEYS.RUNWAYML || '';
    this.baseUrl = 'https://api.runwayml.com/v1';
    this.rendersDir = path.join(process.cwd(), 'public', 'renders');
    
    if (!fs.existsSync(this.rendersDir)) {
      fs.mkdirSync(this.rendersDir, { recursive: true });
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_runwayml_api_key_here';
  }

  async generateVideo(options: RunwayMLOptions): Promise<RunwayMLResponse> {
    if (!this.isAvailable()) {
      return {
        requestId: '',
        status: 'error',
        error: 'RunwayML API key not configured'
      };
    }

    try {
      console.log(`🎬 Generating video with RunwayML: "${options.prompt.substring(0, 50)}..."`);

      const model = options.model || RUNWAYML_MODELS.GEN3_ALPHA;

      const requestBody = {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt || 'low quality, blurry, distorted',
        model: model,
        duration: options.duration || 10,
        aspect_ratio: '9:16',
      };

      const response = await fetch(`${this.baseUrl}/generations/text-to-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`RunwayML API error: ${response.status} - ${error}`);
        return {
          requestId: '',
          status: 'error',
          error: `API error: ${response.status}`
        };
      }

      const data = await response.json() as any;

      if (data.id) {
        return {
          requestId: data.id,
          status: 'processing',
        };
      }

      if (data.output?.video) {
        return {
          requestId: data.id || `runway_${Date.now()}`,
          status: 'success',
          videoUrl: data.output.video
        };
      }

      return {
        requestId: `runway_${Date.now()}`,
        status: 'processing',
      };
    } catch (error: any) {
      console.error('RunwayML video generation error:', error);
      return {
        requestId: '',
        status: 'error',
        error: error.message
      };
    }
  }

  async checkStatus(requestId: string): Promise<RunwayMLStatusResponse> {
    if (!this.isAvailable()) {
      return {
        requestId,
        status: 'error',
        error: 'RunwayML API key not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/generations/${requestId}`, {
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

      const data = await response.json() as any;

      let status: 'processing' | 'success' | 'error' | 'failed' = 'processing';
      if (data.status === 'completed') status = 'success';
      else if (data.status === 'failed') status = 'error';

      return {
        requestId: data.id,
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
      const filename = `video_runway_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
      const filepath = path.join(this.rendersDir, filename);

      const response = await fetch(videoUrl);
      if (!response.ok) {
        console.error(`Failed to download video: ${response.status}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      await promisify(fs.writeFile)(filepath, Buffer.from(buffer));

      console.log(`💾 Downloaded RunwayML video: ${filename}`);
      return filepath;
    } catch (error) {
      console.error('Error downloading RunwayML video:', error);
      return null;
    }
  }
}

let runwayMLService: RunwayMLService | null = null;

export function getRunwayMLService(): RunwayMLService {
  if (!runwayMLService) {
    runwayMLService = new RunwayMLService();
  }
  return runwayMLService;
}

export default RunwayMLService;

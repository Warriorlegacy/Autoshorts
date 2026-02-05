import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import https from 'https';
import { API_KEYS, SERVICE_URLS } from '../constants/config';

export interface SkyreelsOptions {
  avatarImage?: string;
  audioUrl: string;
  prompt?: string;
  text?: string;
  model?: string;
}

export interface SkyreelsResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error' | 'failed';
  videoUrl?: string;
  cost?: number;
  error?: string;
}

export interface SkyreelsStatusResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error' | 'failed';
  error?: string;
}

export interface SkyreelsResultResponse {
  requestId: string;
  status: string;
  videoList?: Array<{ url: string }>;
  usage?: { cost: number };
  error?: string;
}

export class SkyreelsService {
  private apiKey: string;
  private baseUrl: string;
  private rendersDir: string;

  constructor() {
    this.apiKey = API_KEYS.SKYREELS || '';
    this.baseUrl = SERVICE_URLS.SKYREELS_API;
    this.rendersDir = path.join(process.cwd(), 'public', 'renders');
    
    if (!fs.existsSync(this.rendersDir)) {
      fs.mkdirSync(this.rendersDir, { recursive: true });
    }
  }

  isAvailable(): boolean {
    // Check if API key is configured and not the placeholder
    const hasKey = !!this.apiKey && this.apiKey !== 'your_skyreels_api_key_here';
    
    // Note: SkyReels via APIFree may have model availability issues
    // The service will handle API errors gracefully
    return hasKey;
  }

  supportsImageInput(modelId: string): boolean {
    const imageModels = [
      'skywork-ai/skyreels-v3/standard/single-avatar',
    ];
    return imageModels.includes(modelId);
  }

  isTextToVideoModel(modelId: string): boolean {
    const textToVideoModels = [
      'skywork-ai/skyreels-v3/standard/text-to-video',
    ];
    return textToVideoModels.includes(modelId);
  }

  /**
   * Submit avatar video generation request
   */
  async generateVideo(options: SkyreelsOptions): Promise<SkyreelsResponse> {
    if (!this.isAvailable()) {
      return {
        requestId: '',
        status: 'error',
        error: 'SkyReels API key not configured'
      };
    }

    const modelId = options.model || 'skywork-ai/skyreels-v3/standard/single-avatar';

    try {
      const payload: any = {
        model: modelId,
        audios: [options.audioUrl],
        prompt: options.prompt || 'The person speaks naturally to the camera. Use a static shot.'
      };

      if (options.avatarImage) {
        payload.first_frame_image = options.avatarImage;
      }

      console.log('🎬 Submitting SkyReels avatar video request...');

      const response = await fetch(`${this.baseUrl}/video/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      if (data.code !== 200) {
        // Check for model not found error
        if (data.error?.code === 'invalid_model' || (data.error?.message && data.error.message.includes('model schema not found'))) {
          console.error('❌ SkyReels model not available through APIFree');
          console.error('   The skywork-ai/skyreels-v3 model may require direct SkyReels API access');
          return {
            requestId: '',
            status: 'error',
            error: 'SkyReels avatar feature temporarily unavailable. Please try Standard Video mode instead.'
          };
        }

        console.error('SkyReels submit error:', data.code_msg);
        return {
          requestId: '',
          status: 'error',
          error: data.code_msg || 'Failed to submit request'
        };
      }

      const requestId = data.resp_data.request_id;
      console.log(`✅ SkyReels request submitted. Request ID: ${requestId}`);

      return {
        requestId,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('SkyReels API error:', error.message);
      return {
        requestId: '',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check the status of a video generation request
   */
  async checkStatus(requestId: string): Promise<SkyreelsStatusResponse> {
    if (!this.isAvailable()) {
      return {
        requestId,
        status: 'error',
        error: 'SkyReels API key not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/video/${requestId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json() as any;

      if (data.code !== 200) {
        return {
          requestId,
          status: 'error',
          error: data.code_msg || 'Failed to check status'
        };
      }

      return {
        requestId,
        status: data.resp_data.status as 'processing' | 'success' | 'error' | 'failed'
      };
    } catch (error: any) {
      console.error('SkyReels status check error:', error.message);
      return {
        requestId,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get the result (video URL) when ready
   */
  async getResult(requestId: string): Promise<SkyreelsResultResponse> {
    if (!this.isAvailable()) {
      return {
        requestId,
        status: 'error',
        error: 'SkyReels API key not configured'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/video/${requestId}/result`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      const data = await response.json() as any;

      if (data.code !== 200) {
        return {
          requestId,
          status: 'error',
          error: data.code_msg || 'Failed to get result'
        };
      }

      return {
        requestId,
        status: data.resp_data.status,
        videoList: data.resp_data.video_list,
        usage: data.resp_data.usage
      };
    } catch (error: any) {
      console.error('SkyReels result error:', error.message);
      return {
        requestId,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Poll for video completion and download when ready
   */
  async waitForCompletion(requestId: string, maxWaitMs = 600000, pollIntervalMs = 10000): Promise<string | null> {
    if (!this.isAvailable()) {
      console.error('SkyReels API key not configured');
      return null;
    }

    const startTime = Date.now();
    let lastStatus = '';

    console.log(`⏳ Polling for SkyReels video completion (max ${maxWaitMs / 1000}s)...`);

    while (Date.now() - startTime < maxWaitMs) {
      const statusResult = await this.checkStatus(requestId);

      if (statusResult.status === 'error') {
        console.error('SkyReels error:', statusResult.error);
        return null;
      }

      if (statusResult.status !== lastStatus) {
        console.log(`📊 Status: ${statusResult.status}`);
        lastStatus = statusResult.status;
      }

      if (statusResult.status === 'success') {
        console.log('✅ Video generation completed! Downloading...');
        
        const result = await this.getResult(requestId);
        
        if (result.videoList && result.videoList.length > 0) {
          const videoUrl = result.videoList[0].url;
          return await this.downloadVideo(videoUrl, requestId);
        }
        
        return null;
      }

      const status = statusResult.status as string;
      if (status !== 'processing' && status !== 'success') {
        console.error('SkyReels generation failed:', statusResult.error);
        return null;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    console.error('⏰ SkyReels video generation timed out');
    return null;
  }

  /**
   * Download video from URL to local file
   */
  private async downloadVideo(videoUrl: string, requestId: string): Promise<string | null> {
    return new Promise((resolve) => {
      const filename = `avatar_${requestId}_${Date.now()}.mp4`;
      const filepath = path.join(this.rendersDir, filename);
      const file = fs.createWriteStream(filepath);

      https.get(videoUrl, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`💾 Avatar video saved: ${filename}`);
            resolve(filepath);
          });
        } else {
          file.close();
          fs.unlink(filepath, () => {});
          console.error(`Failed to download video: ${response.statusCode}`);
          resolve(null);
        }
      }).on('error', (err) => {
        file.close();
        fs.unlink(filepath, () => {});
        console.error('Error downloading video:', err.message);
        resolve(null);
      });
    });
  }

  /**
   * Generate text-to-video (talking avatar from text, with optional avatar image)
   */
  async generateTextToVideo(options: SkyreelsOptions): Promise<SkyreelsResponse> {
    if (!this.isAvailable()) {
      return {
        requestId: '',
        status: 'error',
        error: 'SkyReels API key not configured'
      };
    }

    if (!options.text && !options.audioUrl) {
      return {
        requestId: '',
        status: 'error',
        error: 'Text or audio URL is required for text-to-video'
      };
    }

    try {
      const payload: any = {
        model: options.model || 'skywork-ai/skyreels-v3/standard/text-to-video',
        prompt: options.prompt || 'A person speaks naturally and engagingly to the camera. Use a static shot.',
      };

      if (options.text) {
        payload.text = options.text;
      }

      if (options.audioUrl) {
        payload.audios = [options.audioUrl];
      }

      if (options.avatarImage) {
        payload.first_frame_image = options.avatarImage;
      }

       console.log('🎬 Submitting SkyReels text-to-video request...');
       if (options.avatarImage) {
         console.log('   With custom avatar image');
       }
       console.log('   Model:', payload.model);
       console.log('   Text provided:', options.text ? `${options.text.substring(0, 50)}...` : 'None');
       console.log('   Audio URL provided:', options.audioUrl ? 'Yes' : 'No');

       const response = await fetch(`${this.baseUrl}/video/submit`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${this.apiKey}`,
           'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;
      console.log('📡 SkyReels API response:', JSON.stringify(data, null, 2));

      if (data.code !== 200) {
        // Check for model not found error
        if (data.error?.code === 'invalid_model' || (data.error?.message && data.error.message.includes('model schema not found'))) {
          console.error('❌ SkyReels model not available through APIFree');
          console.error('   The skywork-ai/skyreels-v3 model may require direct SkyReels API access');
          console.error('   See: https://skywork-ai.com/docs for direct API documentation');
          return {
            requestId: '',
            status: 'error',
            error: 'SkyReels model temporarily unavailable. The text-to-video feature requires direct SkyReels API integration. Please try Standard Video mode instead.'
          };
        }

        console.error('❌ SkyReels text-to-video submit error:', data.code_msg || data.message);
        console.error('Response status:', response.status);
        return {
          requestId: '',
          status: 'error',
          error: data.code_msg || data.message || `HTTP ${response.status}: Failed to submit request`
        };
      }

      const requestId = data.resp_data.request_id;
      console.log(`✅ SkyReels text-to-video request submitted. Request ID: ${requestId}`);

      return {
        requestId,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('SkyReels text-to-video API error:', error.message);
      return {
        requestId: '',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Generate video with audio from TTS service
   */
  async generateWithTTS(
    avatarImage: string,
    narration: string,
    languageCode: string,
    voiceName: string,
    speakingRate: number,
    prompt?: string
  ): Promise<{ requestId: string; status: string }> {
    // This requires TTS service - will be integrated via controller
    // Return request ID for polling
    const ttsPlaceholder = {
      requestId: '',
      status: 'processing'
    };

    // TTS will be generated and URL passed to generateVideo
    return ttsPlaceholder;
  }
}

// Singleton instance
let skyreelsService: SkyreelsService | null = null;

export function getSkyreelsService(): SkyreelsService {
  if (!skyreelsService) {
    skyreelsService = new SkyreelsService();
  }
  return skyreelsService;
}

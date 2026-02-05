import Replicate from 'replicate';

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  numOutputs?: number;
}

export class ReplicateService {
  private replicate: Replicate | null;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.REPLICATE_API_KEY || '';
    
    if (this.apiKey) {
      this.replicate = new Replicate({
        auth: this.apiKey,
      });
      console.log('Replicate service initialized');
    } else {
      console.warn('REPLICATE_API_KEY not set, Replicate service will be unavailable');
      this.replicate = null;
    }
  }

  isAvailable(): boolean {
    return this.replicate !== null;
  }

  async generateImage(options: ImageGenerationOptions): Promise<string | null> {
    if (!this.replicate) {
      console.log('Replicate not available, skipping image generation');
      return null;
    }

    const width = options.width || 1080;
    const height = options.height || 1920;

    try {
      console.log('Generating image with Replicate:', options.prompt);
      
      // Use FLUX.1-schnell for fast, high-quality image generation
      const output = await this.replicate.run(
        "black-forest-labs/flux-1-schnell",
        {
          input: {
            prompt: options.prompt,
            aspect_ratio: this.getAspectRatio(width, height),
            output_format: "webp",
            output_quality: 80,
          }
        }
      );

      if (output && typeof output === 'string') {
        console.log('Image generated successfully');
        return output;
      }

      return null;
    } catch (error: any) {
      console.error('Error generating image with Replicate:', error.message);
      return null;
    }
  }

  async generateVideo(prompt: string, duration: number = 5): Promise<string | null> {
    if (!this.replicate) {
      console.log('Replicate not available, skipping video generation');
      return null;
    }

    try {
      console.log('Generating video with Replicate:', prompt);
      
      // Use wan-2.1-1.3b for text-to-video generation
      const output = await this.replicate.run(
        "wavespeedai/wan-2.1-1.3b",
        {
          input: {
            prompt: prompt,
            aspect_ratio: "9:16",  // Vertical format for shorts
            num_frames: Math.min(duration * 24, 81),  // Max 81 frames
            resolution: "480p",
          }
        }
      );

      if (output && typeof output === 'string') {
        console.log('Video generated successfully');
        return output;
      }

      return null;
    } catch (error: any) {
      console.error('Error generating video with Replicate:', error.message);
      return null;
    }
  }

  private getAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    if (Math.abs(ratio - 1) < 0.1) return "1:1";
    if (Math.abs(ratio - 0.5625) < 0.1) return "9:16";  // 1080x1920
    if (Math.abs(ratio - 1.777) < 0.1) return "16:9";
    if (Math.abs(ratio - 0.75) < 0.1) return "3:4";
    return "9:16";  // Default to vertical
  }
}

import { VideoScene } from './renderingService';

export interface TextToVideoRequest {
  prompt: string;
  images?: string[]; // Base64 encoded images
  duration: 30 | 60;
  style?: string;
  language?: string;
}

export interface TextToVideoResult {
  title: string;
  caption: string;
  hashtags: string[];
  scenes: VideoScene[];
  scriptCode?: string; // Generated Remotion code if needed
}

export class OllamaCloudService {
  private apiKey: string;
  private baseUrl: string = 'https://api.ollama.com/v1';
  private model: string = 'gpt-oss-120b';

  constructor() {
    const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      console.warn('OLLAMA_CLOUD_API_KEY not set, Ollama Cloud service will use mock mode');
    }
    this.apiKey = apiKey || '';
  }

  async generateVideoFromText(request: TextToVideoRequest): Promise<TextToVideoResult> {
    if (!this.apiKey) {
      return this.getMockResult(request);
    }

    const systemPrompt = `You are an expert video script writer and Remotion developer. 
Create engaging short-form video scripts optimized for social media platforms like TikTok, Instagram Reels, and YouTube Shorts.

Your task is to generate:
1. A catchy title
2. An engaging caption
3. Relevant hashtags
4. Scene-by-scene breakdown with narration and visual descriptions

Each scene should have:
- A text overlay (short, punchy text)
- Narration text (what the voiceover will say)
- Duration in seconds
- Background type (gradient, image, or color)

Respond in JSON format only.`;

    const userPrompt = `Create a ${request.duration}-second video script based on this prompt: "${request.prompt}"

${request.images && request.images.length > 0 ? `The user has provided ${request.images.length} image(s) to include in the video. Incorporate them into the scenes.` : ''}

Style: ${request.style || 'modern and engaging'}
Language: ${request.language || 'English'}

Generate 3-5 scenes with smooth transitions. Make it viral-worthy!`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.8,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Check for various clipboard/image-related error formats
        const isClipboardError = 
          errorText.includes('clipboard') || 
          errorText.includes('image input') ||
          errorText.includes('Cannot read') ||
          errorText.includes('image_input') ||
          errorText.toLowerCase().includes('image');
        
        if (isClipboardError) {
          throw new Error('CLIPBOARD_NOT_SUPPORTED: The selected AI model does not support image input. Please remove uploaded images and try again, or use the Standard Video mode instead.');
        }
        throw new Error(`Ollama Cloud API error: ${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0].message.content;
      
      // Parse the JSON response
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      // Transform scenes to match VideoScene interface
      const scenes: VideoScene[] = parsed.scenes.map((scene: any, index: number) => ({
        id: `scene-${index + 1}`,
        narration: scene.narration || scene.voiceover || '',
        textOverlay: scene.textOverlay || scene.title || '',
        duration: scene.duration || 10,
        background: {
          type: scene.background?.type || 'gradient',
          source: scene.background?.source || this.getRandomGradient(),
        },
      }));

      // If images were provided, intelligently assign them to scenes
      if (request.images && request.images.length > 0) {
        scenes.forEach((scene, index) => {
          // Assign images in rotation if there are fewer images than scenes
          const imageIndex = index % request.images!.length;
          scene.background = {
            type: 'image',
            source: request.images![imageIndex],
          };
        });
      }

      return {
        title: parsed.title || 'Untitled Video',
        caption: parsed.caption || parsed.description || '',
        hashtags: parsed.hashtags || [],
        scenes,
      };

    } catch (error) {
      console.error('Error generating video from text:', error);
      // Fallback to mock result
      return this.getMockResult(request);
    }
  }

  async generateRemotionCode(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return this.getMockRemotionCode();
    }

    const systemPrompt = `You are a Remotion expert. Write TypeScript/React code for Remotion video components.
Follow Remotion best practices:
- Use 'remotion' package imports
- Use proper typing with TypeScript
- Include animations using interpolate and spring
- Use proper video dimensions (1080x1920 for vertical videos)
- Include audio handling

Output only the code, no explanations.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Cloud API error: ${response.status}`);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      return data.choices[0].message.content;

    } catch (error) {
      console.error('Error generating Remotion code:', error);
      return this.getMockRemotionCode();
    }
  }

  private getMockResult(request: TextToVideoRequest): TextToVideoResult {
    const duration = request.duration || 30;
    const scenesCount = duration === 60 ? 5 : 3;
    
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];

    const scenes: VideoScene[] = [];
    
    for (let i = 0; i < scenesCount; i++) {
      const scene: VideoScene = {
        id: `scene-${i + 1}`,
        narration: `This is scene ${i + 1} of your amazing video about ${request.prompt || 'your topic'}. Make it engaging and memorable!`,
        textOverlay: `Scene ${i + 1}`,
        duration: duration / scenesCount,
        background: {
          type: 'gradient',
          source: gradients[i % gradients.length],
        },
      };

      // If images provided, use them
      if (request.images && request.images[i]) {
        scene.background = {
          type: 'image',
          source: request.images[i],
        };
      }

      scenes.push(scene);
    }

    return {
      title: `Amazing Video About ${request.prompt || 'Your Topic'}`,
      caption: `Check out this amazing video created just for you! 🎬✨`,
      hashtags: ['Video', 'AI', 'Content', 'Viral', 'Trending', 'Shorts', 'Reels', 'TikTok'],
      scenes,
    };
  }

  private getMockRemotionCode(): string {
    return `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const MyVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#000', color: '#fff' }}>
      <div style={{ opacity, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <h1>Hello World!</h1>
      </div>
    </AbsoluteFill>
  );
};`;
  }

  private getRandomGradient(): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  }
}

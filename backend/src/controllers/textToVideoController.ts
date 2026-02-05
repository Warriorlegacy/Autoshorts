import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';
import { OllamaCloudService } from '../services/ollamaCloudService';
import { RenderingService } from '../services/renderingService';
import { getTTSService } from '../services/ttsService';
import { VideoScene } from '../services/renderingService';
import crypto from 'crypto';

const ollamaService = new OllamaCloudService();
const renderingService = new RenderingService();
const ttsService = getTTSService();

// Generate UUID v4
const generateUUID = (): string => {
  return crypto.randomUUID();
};

interface TextToVideoRequest {
  prompt: string;
  images?: string[]; // Base64 encoded images
  duration: 30 | 60;
  style?: string;
  language?: string;
  voiceName?: string;
  speakingRate?: number;
}

// Helper function to convert Base64 to buffer
const base64ToBuffer = (base64: string): Buffer => {
  const matches = base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }
  return Buffer.from(matches[2], 'base64');
};

// Helper function to save Base64 image to file
const saveBase64Image = async (base64: string, filename: string): Promise<string> => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const buffer = base64ToBuffer(base64);
    const imagePath = path.join(process.cwd(), 'public', 'images', filename);
    await fs.writeFile(imagePath, buffer);
    // Return absolute URL so Remotion can load images during rendering
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    return `${backendUrl}/images/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};

export const generateTextToVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, images, duration, style, language, voiceName, speakingRate } = req.body as TextToVideoRequest;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    console.log(`Generating text-to-video for user ${userId}: prompt="${prompt.substring(0, 50)}...", duration=${duration || 30}`);

    // Process images if provided
    let processedImages: string[] = [];
    if (images && images.length > 0) {
      // Ensure images directory exists
      const fs = require('fs').promises;
      const path = require('path');
      const imagesDir = path.join(process.cwd(), 'public', 'images');
      
      try {
        await fs.access(imagesDir);
      } catch {
        await fs.mkdir(imagesDir, { recursive: true });
      }
      
      // Save all images
      for (let i = 0; i < images.length; i++) {
        try {
          const filename = `text-to-video-${Date.now()}-${i}.png`;
          const imageUrl = await saveBase64Image(images[i], filename);
          processedImages.push(imageUrl);
        } catch (error) {
          console.warn(`Failed to save image ${i}:`, error);
        }
      }
    }

    // Generate video script using Ollama Cloud
    const videoResult = await ollamaService.generateVideoFromText({
      prompt,
      images: processedImages.length > 0 ? processedImages : undefined,
      duration: duration || 30,
      style: style || 'modern',
      language: language || 'en-US',
    });

    if (!videoResult || !videoResult.scenes || videoResult.scenes.length === 0) {
      throw new Error('Failed to generate valid video script with scenes');
    }

    // Generate voiceovers for each scene
    console.log(`Generating ${videoResult.scenes.length} voiceovers...`);
    let scenesWithAudio = await Promise.all(
      videoResult.scenes.map(async (scene, index) => {
        try {
          const ttsResult = await ttsService.synthesize({
            text: scene.narration,
            languageCode: language || 'en-US',
            voiceName: voiceName || 'en-US-Neural2-C',
            speakingRate: speakingRate || 1.0,
            pitch: 0,
          });

          return {
            ...scene,
            audioUrl: ttsResult.isMock ? undefined : ttsResult.audioUrl,
            audioDuration: ttsResult.duration,
          };
        } catch (error) {
          console.warn(`Failed to generate audio for scene ${index}:`, error);
          return scene;
        }
      })
    );

    // Generate a UUID for the video
    const videoId = generateUUID();
    console.log('Generated video UUID for text-to-video:', videoId);

    // Create video record in database
    const result = await query(
      `INSERT INTO videos (id, user_id, title, caption, niche, language, duration, visual_style, status, scenes, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, title, caption, status, created_at`,
      [
        videoId,
        userId,
        videoResult.title,
        videoResult.caption,
        'text-to-video',
        language || 'en',
        duration || 30,
        style || 'modern',
        'rendering',
        JSON.stringify(scenesWithAudio),
        JSON.stringify({
          hashtags: videoResult.hashtags,
          voiceName: voiceName || 'en-US-Neural2-C',
          speakingRate: speakingRate || 1.0,
          prompt: prompt,
          hasImages: processedImages.length > 0,
          generationType: 'text-to-video',
          images: processedImages
        })
      ]
    );

    const video = result.rows[0];
    
    if (!video || !video.id) {
      return res.status(500).json({ success: false, message: 'Invalid video record returned from database' });
    }
    
    // videoId was already generated above
    console.log(`Text-to-video ${videoId} created with ${scenesWithAudio.length} scenes. Starting async render...`);

    // Kick off rendering in the background
    renderingService
      .renderVideo(videoId)
      .then(() => {
        console.log(`✓ Text-to-video render completed successfully for video ${videoId}`);
      })
      .catch((error) => {
        console.error(`✗ Text-to-video render failed for video ${videoId}:`, error);
      });

    res.status(201).json({
      success: true,
      videoId: videoId,
      message: 'Text-to-video generation started - rendering in progress',
      status: 'rendering',
      content: {
        title: video.title,
        caption: video.caption,
        hashtags: videoResult.hashtags,
        scenes: scenesWithAudio,
        voiceName: voiceName || 'en-US-Neural2-C',
        hasImages: processedImages.length > 0,
        prompt: prompt
      }
    });

  } catch (error: any) {
    console.error('Text-to-video generation error:', error);
    
    // Handle clipboard/image input errors
    if (error.message.includes('CLIPBOARD_NOT_SUPPORTED') || error.message.includes('clipboard') || error.message.includes('image input')) {
      return res.status(400).json({
        success: false,
        message: 'Image input not supported',
        error: 'The selected AI model does not support image input. Please remove uploaded images and try again, or use the Standard Video mode instead.',
        code: 'IMAGE_INPUT_NOT_SUPPORTED'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate text-to-video',
      error: error.message
    });
  }
};

export const previewVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, images, duration, style } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    console.log(`Generating preview for user ${userId}: prompt="${prompt.substring(0, 50)}..."`);

    // Generate preview without rendering - just return the scene data
    const videoResult = await ollamaService.generateVideoFromText({
      prompt,
      images,
      duration: duration || 30,
      style: style || 'modern',
    });

    res.status(200).json({
      success: true,
      preview: {
        title: videoResult.title,
        caption: videoResult.caption,
        hashtags: videoResult.hashtags,
        scenes: videoResult.scenes,
        duration: duration || 30,
        hasImages: images && images.length > 0
      }
    });

  } catch (error: any) {
    console.error('Preview generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate preview',
      error: error.message
    });
  }
};

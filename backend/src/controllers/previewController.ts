import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { OllamaCloudService } from '../services/ollamaCloudService';

const ollamaService = new OllamaCloudService();

/**
 * Generate a preview of a text-to-video without storing in DB.
 * Returns the script, scenes, title, caption, hashtags, and duration.
 */
export const previewVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, images, duration, style, language } = req.body;
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
      language: language || 'en-US',
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

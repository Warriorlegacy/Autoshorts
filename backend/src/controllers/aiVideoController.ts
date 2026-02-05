import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';
import { getBytezVideoService } from '../services/bytezVideoService';
import { getFalVideoService } from '../services/falVideoService';
import { getReplicateVideoService } from '../services/replicateVideoService';
import { getHeyGenService } from '../services/heygenService';
import { getSkyreelsService } from '../services/skyreelsService';
import { BYTEZ_VIDEO_MODELS } from '../services/bytezVideoService';
import { FAL_VIDEO_MODELS } from '../services/falVideoService';
import { REPLICATE_VIDEO_MODELS } from '../services/replicateVideoService';
import crypto from 'crypto';

const generateUUID = (): string => crypto.randomUUID();

export interface GenerateAIVideoRequest {
  prompt: string;
  provider: 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels';
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

export interface AIVideoResponse {
  requestId: string;
  status: 'processing' | 'success' | 'error';
  videoUrl?: string;
  error?: string;
}

export const generateAIVideo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      prompt,
      provider = 'bytez',
      model,
      duration,
      width,
      height,
      negativePrompt,
      seed
    } = req.body as GenerateAIVideoRequest;

    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    console.log(`🎬 AI Video Generation Request:`);
    console.log(`   User: ${userId}`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Model: ${model || 'default'}`);
    console.log(`   Prompt: "${prompt.substring(0, 100)}..."`);

    let result: AIVideoResponse;

    switch (provider) {
      case 'bytez':
        result = await generateBytezVideo({
          prompt,
          model: model || BYTEZ_VIDEO_MODELS.DEFAULT,
          duration,
          width,
          height
        });
        break;

      case 'fal':
        result = await generateFalVideo({
          prompt,
          model: model || FAL_VIDEO_MODELS.DEFAULT,
          duration,
          width,
          height,
          negativePrompt
        });
        break;

      case 'replicate':
        result = await generateReplicateVideo({
          prompt,
          model: model || REPLICATE_VIDEO_MODELS.DEFAULT,
          duration,
          width,
          height
        });
        break;

      case 'heygen':
        result = await generateHeyGenVideo({
          avatarId: req.body.avatarId,
          avatarImage: req.body.avatarImage,
          audioUrl: req.body.audioUrl,
          prompt
        });
        break;

      case 'skyreels':
        result = await generateSkyReelsVideo({
          avatarImage: req.body.avatarImage,
          audioUrl: req.body.audioUrl,
          prompt
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown provider: ${provider}. Available: bytez, fal, replicate, heygen, skyreels`
        });
    }

    if (result.status === 'error') {
      return res.status(500).json({
        success: false,
        message: 'Video generation failed',
        error: result.error
      });
    }

    const videoId = generateUUID();
    await query(
      `INSERT INTO videos (id, user_id, title, caption, niche, language, duration, visual_style, status, video_url, scenes, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoId,
        userId,
        `AI Video: ${prompt.substring(0, 30)}...`,
        prompt.substring(0, 200),
        'ai-generated',
        'en',
        duration || 30,
        'cinematic',
        result.status === 'success' ? 'completed' : 'processing',
        result.videoUrl || null,
        JSON.stringify([{ narration: prompt, type: 'ai-video' }]),
          JSON.stringify({
          aiVideoProvider: provider,
          aiVideoModel: model || 'default',
          aiVideoRequestId: result.requestId,
          aiVideoUrl: result.videoUrl,
          prompt,
          generationType: 'ai-video'
        })
      ]
    );

    res.status(201).json({
      success: true,
      videoId,
      message: result.status === 'success'
        ? 'Video generated successfully'
        : 'Video generation started - processing in background',
      status: result.status,
      requestId: result.requestId,
      videoUrl: result.videoUrl,
      provider,
      model: model || 'default'
    });

  } catch (error: any) {
    console.error('AI Video generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI video',
      error: error.message
    });
  }
};

async function generateBytezVideo(options: {
  prompt: string;
  model: string;
  duration?: number;
  width?: number;
  height?: number;
}): Promise<AIVideoResponse> {
  const service = getBytezVideoService();

  if (!service.isAvailable()) {
    return {
      requestId: '',
      status: 'error',
      error: 'Bytez API key not configured'
    };
  }

  return service.generateVideo({
    prompt: options.prompt,
    model: options.model,
    width: options.width,
    height: options.height
  });
}

async function generateFalVideo(options: {
  prompt: string;
  model: string;
  duration?: number;
  width?: number;
  height?: number;
  negativePrompt?: string;
  seed?: number;
}): Promise<AIVideoResponse> {
  const service = getFalVideoService();

  if (!service.isAvailable()) {
    return {
      requestId: '',
      status: 'error',
      error: 'FAL API key not configured'
    };
  }

  return service.generateVideo({
    prompt: options.prompt,
    model: options.model,
    duration: options.duration,
    width: options.width || 768,
    height: options.height || 512,
    negativePrompt: options.negativePrompt,
    seed: options.seed
  });
}

async function generateReplicateVideo(options: {
  prompt: string;
  model: string;
  duration?: number;
  width?: number;
  height?: number;
}): Promise<AIVideoResponse> {
  const service = getReplicateVideoService();

  if (!service.isAvailable()) {
    return {
      requestId: '',
      status: 'error',
      error: 'Replicate API key not configured'
    };
  }

  return service.generateVideo({
    prompt: options.prompt,
    model: options.model,
    numFrames: options.duration ? Math.floor(options.duration * 8) : 32,
    width: options.width || 480,
    height: options.height || 272
  });
}

async function generateHeyGenVideo(options: {
  avatarId?: string;
  avatarImage?: string;
  audioUrl?: string;
  prompt?: string;
}): Promise<AIVideoResponse> {
  const service = getHeyGenService();

  if (!service.isAvailable()) {
    return {
      requestId: '',
      status: 'error',
      error: 'HeyGen API key not configured'
    };
  }

  if (!options.audioUrl && !options.prompt) {
    return {
      requestId: '',
      status: 'error',
      error: 'Audio URL or prompt is required for HeyGen'
    };
  }

  const result = await service.generateVideo({
    avatarId: options.avatarId,
    avatarImage: options.avatarImage,
    audioUrl: options.audioUrl || '',
    text: options.prompt
  });

  return {
    requestId: result.videoId,
    status: result.status === 'completed' ? 'success' : result.status,
    videoUrl: result.videoUrl,
    error: result.error
  };
}

async function generateSkyReelsVideo(options: {
  avatarImage?: string;
  audioUrl?: string;
  prompt?: string;
}): Promise<AIVideoResponse> {
  const service = getSkyreelsService();

  if (!service.isAvailable()) {
    return {
      requestId: '',
      status: 'error',
      error: 'SkyReels API key not configured'
    };
  }

  if (!options.audioUrl && !options.prompt) {
    return {
      requestId: '',
      status: 'error',
      error: 'Audio URL or prompt is required for SkyReels'
    };
  }

  const result = await service.generateVideo({
    avatarImage: options.avatarImage,
    audioUrl: options.audioUrl || '',
    prompt: options.prompt
  });

  return {
    requestId: result.requestId,
    status: result.status === 'failed' ? 'error' : result.status,
    videoUrl: result.videoUrl,
    error: result.error
  };
}

export const checkAIVideoStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { requestId } = req.params;
    const { provider } = req.query as { provider?: 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels' };

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    let result: { status: string; videoUrl?: string; error?: string };
    switch (provider) {
      case 'bytez': {
        const bytezResult = await getBytezVideoService().checkStatus(requestId);
        result = { status: bytezResult.status, videoUrl: bytezResult.videoUrl, error: bytezResult.error };
        break;
      }
      case 'fal': {
        const falResult = await getFalVideoService().checkStatus(requestId);
        result = { status: falResult.status, videoUrl: falResult.videoUrl, error: falResult.error };
        break;
      }
      case 'replicate': {
        const replResult = await getReplicateVideoService().checkStatus(requestId);
        result = { status: replResult.status, videoUrl: replResult.videoUrl, error: replResult.error };
        break;
      }
      case 'heygen': {
        const heygenResult = await getHeyGenService().checkStatus(requestId);
        result = {
          status: heygenResult.data.status === 'completed' ? 'success' : heygenResult.data.status,
          videoUrl: heygenResult.data.video_url,
          error: heygenResult.data.error
        };
        break;
      }
      case 'skyreels': {
        const skyResult = await getSkyreelsService().checkStatus(requestId);
        result = { status: skyResult.status, error: skyResult.error };
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          message: 'Provider is required (bytez, fal, replicate, heygen, skyreels)'
        });
    }

    const normalizedStatus = result.status === 'completed' ? 'success' : result.status;

    res.status(200).json({
      success: true,
      status: normalizedStatus,
      videoUrl: result.videoUrl,
      error: result.error
    });

  } catch (error: any) {
    console.error('Check AI video status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check video status',
      error: error.message
    });
  }
};

export const getAIVideoProviders = async (req: AuthRequest, res: Response) => {
  try {
    const bytezService = getBytezVideoService();
    const falService = getFalVideoService();
    const replicateService = getReplicateVideoService();
    const heygenService = getHeyGenService();
    const skyreelsService = getSkyreelsService();

    const providers = [
      {
        id: 'bytez',
        name: 'Bytez',
        description: 'FREE TIER - Text-to-video with ModelScope or ZeroScope',
        requiresKey: true,
        keyName: 'BYTEZ_API_KEY',
        url: 'https://bytez.com/api',
        available: bytezService.isAvailable(),
        pricing: 'Free tier available',
        type: 'text-to-video',
        models: [
          {
            id: BYTEZ_VIDEO_MODELS.DEFAULT,
            name: 'ModelScope',
            description: 'High-quality text-to-video, 576x320',
            type: 'free'
          },
          {
            id: BYTEZ_VIDEO_MODELS.ZEROSCOPE,
            name: 'ZeroScope',
            description: 'Lightweight model, faster generation',
            type: 'free'
          }
        ]
      },
      {
        id: 'fal',
        name: 'FAL AI',
        description: 'PAID - High quality video generation (LTX Video & Mochi)',
        requiresKey: true,
        keyName: 'FAL_API_KEY',
        url: 'https://fal.ai',
        available: falService.isAvailable(),
        pricing: '~$0.04/sec',
        type: 'text-to-video',
        models: [
          {
            id: FAL_VIDEO_MODELS.MOCHI,
            name: 'Mochi 1',
            description: 'Open source high-quality video, 2-4 sec, 30fps',
            type: 'paid'
          },
          {
            id: FAL_VIDEO_MODELS.LTX_VIDEO,
            name: 'LTX Video',
            description: 'State-of-the-art video generation, 5-10 sec, 24fps',
            type: 'paid'
          }
        ]
      },
      {
        id: 'replicate',
        name: 'Replicate',
        description: 'PAID - CogVideo 9B, ~$0.0028/run',
        requiresKey: true,
        keyName: 'REPLICATE_API_KEY',
        url: 'https://replicate.com/THUDM/CogVideo',
        available: replicateService.isAvailable(),
        pricing: '~$0.0028/run',
        type: 'text-to-video',
        models: [
          {
            id: REPLICATE_VIDEO_MODELS.COGVIDEO_9B,
            name: 'CogVideo',
            description: 'Open source 9B parameter model',
            type: 'paid'
          }
        ]
      },
      {
        id: 'heygen',
        name: 'HeyGen',
        description: 'PAID - AI Avatar videos with lip-sync',
        requiresKey: true,
        keyName: 'HEYGEN_API_KEY',
        url: 'https://heygen.com',
        available: heygenService.isAvailable(),
        pricing: '$0.40/min after free tier',
        type: 'avatar',
        models: [
          {
            id: 'default-avatar',
            name: 'Default Avatar',
            description: 'High-quality avatar with natural lip-sync',
            type: 'paid'
          }
        ]
      },
      {
        id: 'skyreels',
        name: 'SkyReels',
        description: 'PAID/FREE - AI Avatar video generation',
        requiresKey: true,
        keyName: 'SKYREELS_API_KEY',
        url: 'https://skywork-ai.com',
        available: skyreelsService.isAvailable(),
        pricing: 'Freemium available',
        type: 'avatar',
        models: [
          {
            id: 'skywork-ai/skyreels-v3/standard/single-avatar',
            name: 'SkyReels V3 Avatar',
            description: 'High-quality avatar with lip-sync',
            type: 'freemium'
          }
        ]
      }
    ];

    res.status(200).json({
      success: true,
      providers,
      defaults: {
        free: 'bytez',
        paid: 'fal',
        avatar: 'heygen'
      }
    });

  } catch (error: any) {
    console.error('Get AI video providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get providers',
      error: error.message
    });
  }
};

export const testAIVideoProvider = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { provider } = req.body as { provider?: 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels' };

    if (!provider) {
      return res.status(400).json({ success: false, message: 'Provider is required' });
    }

    const testPrompt = 'A cat walking through a garden, cinematic lighting, high quality';

    console.log(`🧪 Testing ${provider} video generation...`);

    let result: AIVideoResponse;
    switch (provider) {
      case 'bytez':
        result = await getBytezVideoService().generateVideo({
          prompt: testPrompt,
          model: BYTEZ_VIDEO_MODELS.DEFAULT
        });
        break;
      case 'fal':
        result = await getFalVideoService().generateVideo({
          prompt: testPrompt,
          model: FAL_VIDEO_MODELS.DEFAULT
        });
        break;
      case 'replicate':
        result = await getReplicateVideoService().generateVideo({
          prompt: testPrompt,
          model: REPLICATE_VIDEO_MODELS.COGVIDEO
        });
        break;
      case 'heygen':
        result = await generateHeyGenVideo({
          prompt: 'Hello! This is a test video.'
        });
        break;
      case 'skyreels':
        result = await generateSkyReelsVideo({
          prompt: 'A person speaks naturally and engagingly to the camera.'
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown provider: ${provider}`
        });
    }

    res.status(200).json({
      success: result.status !== 'error',
      provider,
      status: result.status,
      requestId: result.requestId,
      videoUrl: result.videoUrl,
      error: result.error
    });

  } catch (error: any) {
    console.error('Test AI video provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test provider',
      error: error.message
    });
  }
};

export default {
  generateAIVideo,
  checkAIVideoStatus,
  getAIVideoProviders,
  testAIVideoProvider
};

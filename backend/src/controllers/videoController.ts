import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';
import { ScriptService } from '../services/scriptService';
import { RenderingService } from '../services/renderingService';
import { getTTSService } from '../services/ttsService';
import { getImageGenerationService } from '../services/imageService';
import { VideoScene } from '../services/renderingService';
import crypto from 'crypto';

// Generate UUID v4
const generateUUID = (): string => {
  return crypto.randomUUID();
};

// Type definitions
interface GenerateVideoRequest {
  niche: string;
  duration?: number;
  visualStyle?: string;
  language?: string;
  voiceName?: string;
  speakingRate?: number;
  generateImages?: boolean;
  scriptProvider?: string; // groq | openrouter | together
  scriptModel?: string; // Model name within the provider
  imageProvider?: string;  // pollinations | huggingface | replicate
  imageModel?: string; // Model name for the image provider
  ttsProvider?: string; // edge-tts | murf
  ttsModel?: string; // Voice model ID
}

interface VideoRecord {
  id: string;
  title: string;
  caption: string;
  niche: string;
  duration: number;
  visual_style: string;
  status: string;
  metadata: string | Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Validation helper
const validateRequest = <T extends Record<string, any>>(data: unknown, requiredFields: (keyof T)[]): data is T => {
  if (!data || typeof data !== 'object') return false;
  return requiredFields.every(field => field in data && (data as any)[field] !== undefined);
};

const scriptService = new ScriptService();
const renderingService = new RenderingService();
const ttsService = getTTSService();
const imageService = getImageGenerationService();

export const generateVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      niche, 
      duration, 
      visualStyle, 
      language, 
      voiceName, 
      speakingRate, 
      generateImages,
      scriptProvider,
      scriptModel,
      imageProvider,
      imageModel,
      ttsProvider,
      ttsModel
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Set TTS provider if specified
    if (ttsProvider) {
      process.env.TTS_PROVIDER = ttsProvider;
    }

    // Validate input
    if (!niche) {
      return res.status(400).json({ success: false, message: 'Niche is required' });
    }

    console.log(`Generating video for user ${userId}: niche=${niche}, duration=${duration || 60}, language=${language || 'en-US'}`);
    console.log(`Using providers: script=${scriptProvider || 'default'}/${scriptModel || 'default'}, images=${imageProvider || 'default'}/${imageModel || 'default'}, tts=${ttsProvider || 'default'}/${ttsModel || 'default'}`);

    // Generate script with selected provider
    const script = await scriptService.generateScript(niche, duration || 60, scriptProvider, scriptModel);

    if (!script || !script.scenes || script.scenes.length === 0) {
      throw new Error('Failed to generate valid script with scenes');
    }

    // Generate voiceovers for each scene
    console.log(`Generating ${script.scenes.length} voiceovers using ${ttsProvider || 'edge-tts'}...`);
    let scenesWithAudio = await Promise.all(
      script.scenes.map(async (scene: any, index: number) => {
        try {
          const ttsResult = await ttsService.synthesize({
            text: scene.narration,
            languageCode: language || 'en-US',
            voiceName: voiceName || ttsModel || 'en-US-JennyNeural',
            speakingRate: speakingRate || 1.0,
            pitch: 0,
          });

          return {
            ...scene,
            audioUrl: ttsResult.audioUrl || undefined,
            audioDuration: ttsResult.duration,
          };
        } catch (error) {
          console.warn(`Failed to generate audio for scene ${index}:`, error);
          // Continue without audio if TTS fails
          return scene;
        }
      })
    );

    // Generate background images if requested
    if (generateImages) {
      console.log(`Generating background images for ${scenesWithAudio.length} scenes...`);
      scenesWithAudio = await Promise.all(
        scenesWithAudio.map(async (scene: any) => {
          try {
            // Create an image prompt based on the narration
            const imagePrompt = `${visualStyle} style background for video scene: ${scene.narration.substring(0, 50)}`;
            
            const imageResult = await imageService.generateImage({
              prompt: imagePrompt,
              style: (visualStyle as any) || 'cinematic',
              aspectRatio: '9:16',
              quality: 'high',
              provider: imageProvider, // Pass selected image provider
              model: imageModel, // Pass selected image model
            });

            return {
              ...scene,
              background: {
                type: 'image',
                source: imageResult.imageUrl,
              },
            };
          } catch (error) {
            console.warn(`Failed to generate image for scene:`, error);
            // Keep original background if image generation fails
            return scene;
          }
        })
      );
    }

    // Generate a UUID for the video
    const videoId = generateUUID();
    console.log('Generated video UUID:', videoId);

    console.log('Preparing to insert video into database...');
    console.log('Video data:', {
      userId,
      title: script.title,
      niche,
      scenesCount: scenesWithAudio.length
    });
    
    // Create video record in database
    let result;
    try {
      result = await query(
        `INSERT INTO videos (id, user_id, title, caption, niche, language, duration, visual_style, status, scenes, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id, title, caption, status, created_at`,
        [
          videoId,
          userId,
          script.title,
          script.caption,
          niche,
          language || 'en',
          duration || 60,
          visualStyle || 'modern',
          'rendering',
          JSON.stringify(scenesWithAudio),
          JSON.stringify({ 
            hashtags: script.hashtags,
            voiceName: voiceName || 'en-US-Neural2-C',
            speakingRate: speakingRate || 1.0,
            hasImages: generateImages || false
          })
        ]
      );
      console.log('Database insert successful');
    } catch (dbError: any) {
      console.error('Database insert failed:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    const video = result.rows[0];
    console.log('Extracted video from result:', { videoId: video?.id, title: video?.title });
    
    // Guard against missing video data
    if (!video || !video.id) {
      console.error('Invalid video record:', video);
      console.error('Full result object:', result);
      return res.status(500).json({ success: false, message: 'Invalid video record returned from database' });
    }
    
    const finalVideoId = video.id;
    console.log(`✓ Video ID extracted: ${finalVideoId}`);

    console.log(`Starting async render for video ${finalVideoId} with ${scenesWithAudio.length} scenes...`);

    // Kick off rendering in the background with proper error notification
    try {
      renderingService
        .renderVideo(finalVideoId)
        .then(() => {
          console.log(`✓ Render completed successfully for video ${finalVideoId}`);
        })
        .catch((error) => {
          console.error(`✗ Render failed for video ${finalVideoId}:`, error.message);
        });
      console.log('✓ Render service called successfully');
    } catch (renderError: any) {
      console.error('✗ Error calling render service:', renderError.message);
      // Continue anyway - the video is in the database
    }

    console.log('Preparing to send success response...');
    
    try {
      res.status(201).json({
        success: true,
        videoId: finalVideoId,
        message: 'Video generation started - rendering in progress',
        status: 'rendering',
        content: {
          title: video.title,
          caption: video.caption,
          hashtags: script.hashtags,
          scenes: scenesWithAudio,
          voiceName: voiceName || 'en-US-Neural2-C',
          hasImages: generateImages || false
        }
      });
      console.log('✓ Success response sent');
    } catch (responseError: any) {
      console.error('✗ Error sending response:', responseError.message);
      throw responseError;
    }

  } catch (error: any) {
    console.error('Video generation error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Failed to generate video',
      error: error.message || 'Unknown error occurred'
    });
  }
};

export const getVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log(`Fetching video ${videoId} for user ${userId}`);

    const result = await query(
      'SELECT * FROM videos WHERE id = ? AND user_id = ?',
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = result.rows[0];
    
    // Validate video data
    if (!video || !video.id) {
      return res.status(500).json({ success: false, message: 'Invalid video record' });
    }
    
    // Parse scenes and metadata
    let scenes = [];
    let metadata: any = {};
    let hashtags = [];
    
    try {
      if (video.scenes) {
        scenes = typeof video.scenes === 'string' ? JSON.parse(video.scenes) : video.scenes;
      }
    } catch (e) {
      console.warn('Failed to parse scenes:', e);
    }
    
    try {
      if (video.metadata) {
        metadata = typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata;
        hashtags = metadata?.hashtags || [];
      }
    } catch (e) {
      console.warn('Failed to parse metadata:', e);
    }
    
    res.status(200).json({
      success: true,
      video: {
        id: video.id,
        title: video.title ?? 'Untitled',
        caption: video.caption ?? '',
        hashtags,
        niche: video.niche,
        duration: video.duration,
        visualStyle: video.visual_style,
        status: video.status,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        scenes,
        metadata,
        createdAt: video.created_at,
        updatedAt: video.updated_at
      }
    });

  } catch (error: any) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video',
      error: error.message
    });
  }
};

export const getVideoStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const result = await query(
      'SELECT id, title, caption, status, video_url, thumbnail_url, created_at FROM videos WHERE id = ? AND user_id = ?',
      [videoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = result.rows[0];
    
    // Validate video data
    if (!video || !video.id) {
      return res.status(500).json({ success: false, message: 'Invalid video record' });
    }
    
    res.status(200).json({
      success: true,
      video: {
        id: video.id,
        title: video.title ?? 'Untitled',
        caption: video.caption ?? '',
        status: video.status ?? 'unknown',
        videoUrl: video.video_url ?? null,
        thumbnailUrl: video.thumbnail_url ?? null,
        createdAt: video.created_at
      }
    });

  } catch (error: any) {
    console.error('Get video status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get video status',
      error: error.message
    });
  }
};

export const getUserVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Single query instead of N+1: count and fetch in one query
    const result = await query(
      `SELECT 
        id, title, caption, niche, duration, visual_style, status, metadata, created_at, updated_at,
        COUNT(*) OVER() as total
       FROM videos WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Extract total count from first row (or 0 if no rows)
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total, 10) : 0;

    const videos = result.rows.map((video: any) => {
      let hashtags: string[] = [];
      try {
        if (video.metadata) {
          const parsed = typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata;
          hashtags = parsed.hashtags || [];
        }
      } catch (e) {
        hashtags = [];
      }

      return {
        id: video.id,
        title: video.title,
        caption: video.caption,
        hashtags,
        niche: video.niche,
        duration: video.duration,
        visualStyle: video.visual_style,
        status: video.status,
        createdAt: video.created_at,
        updatedAt: video.updated_at
      };
    });

    res.status(200).json({
      success: true,
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user videos',
      error: error.message
    });
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if video belongs to user
    const checkResult = await query(
      'SELECT id FROM videos WHERE id = ? AND user_id = ?',
      [videoId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Delete video
    await query('DELETE FROM videos WHERE id = ? AND user_id = ?', [videoId, userId]);

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete video',
      error: error.message
    });
  }
};

export const regenerateVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get the existing video with its parameters
    const videoResult = await query(
      `SELECT id, title, caption, niche, duration, visual_style, language, metadata, scenes 
       FROM videos WHERE id = ? AND user_id = ?`,
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = videoResult.rows[0];
    
    if (!video || !video.id) {
      return res.status(500).json({ success: false, message: 'Invalid video record' });
    }

    // Parse metadata to get original generation parameters
    let metadata: any = {};
    try {
      if (video.metadata) {
        metadata = typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata;
      }
    } catch (e) {
      console.warn('Failed to parse video metadata:', e);
    }

    const voiceName = metadata.voiceName || 'en-US-Neural2-C';
    const speakingRate = metadata.speakingRate || 1.0;
    const hasImages = metadata.hasImages || false;
    const language = video.language || 'en';

    console.log(`Regenerating video ${videoId} with original parameters: niche=${video.niche}, duration=${video.duration}, language=${language}`);

    // Generate new script using Gemini
    const script = await scriptService.generateScript(video.niche, video.duration || 60);

    if (!script || !script.scenes || script.scenes.length === 0) {
      throw new Error('Failed to generate valid script with scenes');
    }

    // Generate new voiceovers for each scene
    console.log(`Generating ${script.scenes.length} voiceovers for regenerated video...`);
    let scenesWithAudio = await Promise.all(
      script.scenes.map(async (scene: any, index: number) => {
        try {
          const ttsResult = await ttsService.synthesize({
            text: scene.narration,
            languageCode: language,
            voiceName: voiceName,
            speakingRate: speakingRate,
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

    // Generate new background images if original had them
    if (hasImages) {
      console.log(`Generating new background images for ${scenesWithAudio.length} scenes...`);
      scenesWithAudio = await Promise.all(
        scenesWithAudio.map(async (scene: any) => {
          try {
            const imagePrompt = `${video.visual_style} style background for video scene: ${scene.narration.substring(0, 50)}`;
            
            const imageResult = await imageService.generateImage({
              prompt: imagePrompt,
              style: (video.visual_style as any) || 'cinematic',
              aspectRatio: '9:16',
              quality: 'high',
              provider: (video as any).imageProvider,
              model: (video as any).imageModel,
            });

            return {
              ...scene,
              background: {
                type: 'image',
                source: imageResult.imageUrl,
              },
            };
          } catch (error) {
            console.warn(`Failed to generate image for scene:`, error);
            return scene;
          }
        })
      );
    }

    // Update video record with new content
    await query(
      `UPDATE videos 
       SET title = ?, caption = ?, scenes = ?, metadata = ?, status = 'rendering', updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        script.title,
        script.caption,
        JSON.stringify(scenesWithAudio),
        JSON.stringify({ 
          hashtags: script.hashtags,
          voiceName: voiceName,
          speakingRate: speakingRate,
          hasImages: hasImages,
          regeneratedAt: new Date().toISOString()
        }),
        videoId,
        userId
      ]
    );

    console.log(`Video ${videoId} updated with new content. Starting async render...`);

    // Kick off rendering in the background
    renderingService
      .renderVideo(videoId)
      .then(() => {
        console.log(`✓ Regenerated video ${videoId} render completed successfully`);
      })
      .catch((error) => {
        console.error(`✗ Regenerated video ${videoId} render failed:`, error);
      });

    res.status(200).json({
      success: true,
      videoId: videoId,
      message: 'Video regeneration started - rendering in progress',
      status: 'rendering',
      content: {
        title: script.title,
        caption: script.caption,
        hashtags: script.hashtags,
        scenes: scenesWithAudio,
        voiceName: voiceName,
        hasImages: hasImages
      }
    });

  } catch (error: any) {
    console.error('Video regeneration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate video',
      error: error.message
    });
  }
};

/**
 * Get available AI providers
 */
export const getProviders = async (req: AuthRequest, res: Response) => {
  try {
    const scriptProviders = scriptService.getAvailableProviders();
    const imageProviders = imageService.getAvailableProviders();
    const skyreelsService = new (require('../services/skyreelsService').SkyreelsService)();

    const scriptProviderDetails = [
      {
        id: 'groq',
        name: 'Groq',
        description: 'FREE TIER - 1,500 req/day, fast inference',
        requiresKey: true,
        keyName: 'GROQ_API_KEY',
        available: scriptProviders.find(p => p.name === 'groq')?.available || false,
        models: [
          { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', description: 'Fast, cost-effective' },
          { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile', description: 'Balanced speed and quality' },
          { id: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B', description: 'Highest quality' },
        ]
      },
      {
        id: 'openrouter',
        name: 'OpenRouter',
        description: 'FREE TIER - Access to various models (Claude, GPT, Llama)',
        requiresKey: true,
        keyName: 'OPENROUTER_API_KEY',
        available: scriptProviders.find(p => p.name === 'openrouter')?.available || false,
        models: [
          { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)', description: 'Free tier model' },
          { id: 'anthropic/claude-3-haiku:free', name: 'Claude 3 Haiku (Free)', description: 'Fast, intelligent' },
        ]
      },
      {
        id: 'together',
        name: 'Together AI',
        description: 'FREE TIER - $5 credit for new users',
        requiresKey: true,
        keyName: 'TOGETHER_API_KEY',
        available: scriptProviders.find(p => p.name === 'together')?.available || false,
        models: [
          { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B Turbo', description: 'Fast inference' },
          { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B Turbo', description: 'High quality' },
        ]
      },
    ];

    const imageProviderDetails = [
      {
        id: 'craiyon',
        name: 'Craiyon',
        description: '100% FREE - No API key needed, generates 9 images per request',
        requiresKey: false,
        available: true,
        models: [
          { id: 'gallery', name: 'Gallery Model', description: 'Best quality, generates 9 images' },
          { id: 'optimized', name: 'Optimized', description: 'Faster generation' }
        ]
      },
      {
        id: 'deepai',
        name: 'DeepAI',
        description: 'FREE TIER - No API key needed for limited use. Uses Stable Diffusion.',
        requiresKey: false,
        available: true,
        models: [
          { id: 'stable-diffusion', name: 'Stable Diffusion', description: 'Classic SD model' },
          { id: 'waifu-diffusion', name: 'Waifu Diffusion', description: 'Anime style images' },
          { id: 'realistic-vision', name: 'Realistic Vision', description: 'Photorealistic images' }
        ]
      },
      {
        id: 'pollinations',
        name: 'Pollinations AI',
        description: '100% FREE - No API key needed, unlimited generations, high quality',
        requiresKey: false,
        available: true,
        models: [
          { id: 'default', name: 'Default', description: 'Best quality settings' },
          { id: 'flux', name: 'Flux', description: 'Latest Flux model' },
          { id: 'realism', name: 'Realism', description: 'Photorealistic style' }
        ]
      },
      {
        id: 'leonardo',
        name: 'Leonardo AI',
        description: 'FREE TIER - 150 credits/day. Requires API key from leonardo.ai',
        requiresKey: true,
        keyName: 'LEONARDO_API_KEY',
        available: imageProviders.find(p => p.name === 'leonardo')?.available || false,
        models: [
          { id: 'e71a1c0f-4e15-4b3f-8e2b-9d6c7b8a5f4e', name: 'Leonardo Kino XL', description: 'Latest model, best quality - FREE TIER' },
          { id: '1e608195-47c0-4f88-a28b-3b7c6c5e2d1a', name: 'Leonardo Vision XL', description: 'Vision model - FREE TIER' },
          { id: 'b820ea11-02bf-47dd-9617-9e8ffc349ee1', name: 'Leonardo Alchemy', description: 'High quality diffusion - FREE TIER' },
          { id: 'aa77f04e-3eec-4034-9c07-d0f419392628', name: 'Leonardo Diffusion', description: 'Classic diffusion model - FREE TIER' }
        ]
      },
      {
        id: 'huggingface',
        name: 'Hugging Face',
        description: 'FREE TIER - 1,000 requests/month. Requires API key.',
        requiresKey: true,
        keyName: 'HUGGINGFACE_API_KEY',
        available: imageProviders.find(p => p.name === 'huggingface')?.available || false,
        models: [
          { id: 'stabilityai/stable-diffusion-2-1', name: 'SD 2.1', description: 'No gated access required - RECOMMENDED' },
          { id: 'segmind/SSD-1B', name: 'SSD-1B', description: 'Fast generation, no approval needed' },
          { id: 'prompthero/openjourney-v4', name: 'OpenJourney', description: 'Midjourney style - May need approval' },
          { id: 'digiplay/AbsoluteReality_v1.8', name: 'Absolute Reality', description: 'Realistic portraits - May need approval' },
          { id: 'Lykon/DreamShaper', name: 'DreamShaper', description: 'Artistic style - May need approval' },
          { id: 'runwayml/stable-diffusion-v1-5', name: 'SD 1.5', description: 'Classic - Requires access approval' }
        ]
      },
      {
        id: 'replicate',
        name: 'Replicate (Flux)',
        description: 'FREE TIER - Various models including Flux. Requires API key.',
        requiresKey: true,
        keyName: 'REPLICATE_API_KEY',
        available: imageProviders.find(p => p.name === 'replicate')?.available || false,
        models: [
          { id: 'black-forest-labs/flux-1-schnell', name: 'Flux Schnell', description: 'Fast generation, 4 steps' },
          { id: 'black-forest-labs/flux-1-dev', name: 'Flux Dev', description: 'Higher quality, 50 steps' },
          { id: 'black-forest-labs/flux-1-pro', name: 'Flux Pro', description: 'Best quality, commercial use' },
          { id: 'stability-ai/sdxl', name: 'SDXL via Replicate', description: 'Stable Diffusion XL' }
        ]
      },
    ];

    const avatarProviderDetails = [
      {
        id: 'skyreels',
        name: 'SkyReels V3 (Image-to-Video)',
        description: 'AI Digital Human - Lip-sync avatar videos with your avatar image',
        requiresKey: true,
        keyName: 'SKYREELS_API_KEY',
        url: 'https://apifree.ai',
        available: skyreelsService.isAvailable(),
        supportsImageInput: true,
        models: [
          { id: 'skywork-ai/skyreels-v3/standard/single-avatar', name: 'Single Avatar', description: 'Generate talking avatar from your image' }
        ]
      },
      {
        id: 'skyreels-text',
        name: 'SkyReels Text-to-Video',
        description: 'Generate talking avatar videos from text - Optional avatar image for custom appearance',
        requiresKey: true,
        keyName: 'SKYREELS_API_KEY',
        url: 'https://apifree.ai',
        available: skyreelsService.isAvailable(),
        supportsImageInput: true,
        models: [
          { id: 'skywork-ai/skyreels-v3/standard/text-to-video', name: 'Text-to-Video', description: 'Generate AI avatar video from text with optional custom image' }
        ]
      },
    ];

    const ttsProviderDetails = [
      {
        id: 'edge-tts',
        name: 'Edge TTS',
        description: '100% FREE - Microsoft Edge TTS via Python, no API key needed',
        requiresKey: false,
        available: true,
        models: [
          { id: 'en-US-JennyNeural', name: 'Jenny (Female)', description: 'Clear, professional female voice' },
          { id: 'en-US-GuyNeural', name: 'Guy (Male)', description: 'Clear, professional male voice' },
          { id: 'en-GB-SoniaNeural', name: 'Sonia (UK Female)', description: 'British female voice' },
          { id: 'en-GB-RyanNeural', name: 'Ryan (UK Male)', description: 'British male voice' },
          { id: 'es-ES-ElviraNeural', name: 'Elvira (Spanish)', description: 'Spanish female voice' },
          { id: 'fr-FR-DeniseNeural', name: 'Denise (French)', description: 'French female voice' },
          { id: 'de-DE-KatjaNeural', name: 'Katja (German)', description: 'German female voice' },
          { id: 'ja-JP-NanamiNeural', name: 'Nanami (Japanese)', description: 'Japanese female voice' },
        ]
      },
      {
        id: 'murf',
        name: 'Murf AI',
        description: 'PAID - High quality AI voices, requires API key',
        requiresKey: true,
        keyName: 'MURF_API_KEY',
        url: 'https://murf.ai',
        available: !!(process.env.MURF_API_KEY && process.env.MURF_API_KEY !== 'your_murf_api_key_here'),
        pricing: 'Subscription based',
        models: [
          { id: 'en-US-female-1', name: 'Female (US)', description: 'Professional female voice' },
          { id: 'en-US-male-1', name: 'Male (US)', description: 'Professional male voice' },
          { id: 'en-GB-female-1', name: 'Female (UK)', description: 'British female voice' },
          { id: 'en-GB-male-1', name: 'Male (UK)', description: 'British male voice' },
          { id: 'es-ES-female-1', name: 'Female (Spanish)', description: 'Spanish female voice' },
          { id: 'es-ES-male-1', name: 'Male (Spanish)', description: 'Spanish male voice' },
          { id: 'fr-FR-female-1', name: 'Female (French)', description: 'French female voice' },
          { id: 'fr-FR-male-1', name: 'Male (French)', description: 'French male voice' },
          { id: 'de-DE-female-1', name: 'Female (German)', description: 'German female voice' },
          { id: 'de-DE-male-1', name: 'Male (German)', description: 'German male voice' },
          { id: 'pt-BR-female-1', name: 'Female (Portuguese)', description: 'Brazilian female voice' },
          { id: 'pt-BR-male-1', name: 'Male (Portuguese)', description: 'Brazilian male voice' },
          { id: 'ja-JP-female-1', name: 'Female (Japanese)', description: 'Japanese female voice' },
          { id: 'ja-JP-male-1', name: 'Male (Japanese)', description: 'Japanese male voice' },
        ]
      },
    ];

    res.status(200).json({
      success: true,
      providers: {
        script: scriptProviderDetails,
        image: imageProviderDetails,
        avatar: avatarProviderDetails,
        tts: ttsProviderDetails,
      },
      defaults: {
        script: process.env.SCRIPT_PROVIDER || 'groq',
        image: process.env.IMAGE_PROVIDER || 'pollinations',
        avatar: 'skyreels',
        tts: process.env.TTS_PROVIDER || 'edge-tts',
      }
    });
  } catch (error: any) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get providers',
      error: error.message
    });
  }
};

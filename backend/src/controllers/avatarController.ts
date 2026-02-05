import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';
import { getSkyreelsService } from '../services/skyreelsService';
import { getHeyGenService } from '../services/heygenService';
import { getTTSService } from '../services/ttsService';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const generateUUID = (): string => {
  return crypto.randomUUID();
};

export interface AvatarGenerateRequest {
  avatarImage?: string;
  audioSource: 'tts' | 'upload';
  script?: string;
  voiceName?: string;
  language?: string;
  speakingRate?: number;
  prompt?: string;
  customAudioUrl?: string;
  provider?: 'skyreels' | 'skyreels-text';
}

export interface TextToAvatarRequest {
  text: string;
  audioSource: 'tts' | 'upload';
  voiceName?: string;
  language?: string;
  speakingRate?: number;
  prompt?: string;
  customAudioUrl?: string;
}

export const generateAvatarVideo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const {
      avatarImage,
      audioSource,
      script,
      voiceName,
      language,
      speakingRate,
      prompt,
      customAudioUrl,
      provider
    } = req.body as AvatarGenerateRequest;

    if (!audioSource) {
      return res.status(400).json({ success: false, message: 'Audio source is required' });
    }

    if (audioSource === 'tts' && !script) {
      return res.status(400).json({ success: false, message: 'Script is required for TTS' });
    }

    if (audioSource === 'upload' && !customAudioUrl) {
      return res.status(400).json({ success: false, message: 'Audio file URL is required' });
    }

    if (provider !== 'skyreels-text' && !avatarImage) {
      return res.status(400).json({ success: false, message: 'Avatar image is required for Image-to-Video generation' });
    }

    console.log(`🎬 Generating avatar video for user ${userId}`);
    console.log(`   Audio source: ${audioSource}`);
    if (avatarImage) {
      console.log(`   Avatar image: ${avatarImage.substring(0, 50)}...`);
    }

    // Get services
    const ttsService = getTTSService();
    const skyreelsService = getSkyreelsService();
    const heygenService = getHeyGenService();

    // Generate audio URL
    let audioUrl: string;

    if (audioSource === 'tts') {
      console.log(`🔊 Generating TTS audio for script: "${script?.substring(0, 50)}..."`);

      const ttsResult = await ttsService.synthesize({
        text: script || '',
        languageCode: language || 'en-US',
        voiceName: voiceName || 'en-US-JennyNeural',
        speakingRate: speakingRate || 1.0,
        pitch: 0,
      });

      if (!ttsResult.audioUrl || ttsResult.isMock) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate audio for avatar video',
          error: 'TTS generation failed'
        });
      }

      audioUrl = ttsResult.audioUrl;
      console.log(`✅ TTS audio generated: ${audioUrl}`);
    } else {
      audioUrl = customAudioUrl!;
      console.log(`📎 Using uploaded audio: ${audioUrl}`);
    }

    // Try avatar providers in order: SkyReels -> HeyGen
    let result: { provider: string; requestId: string; status: string; error?: string } | null = null;
    let lastError: string = '';

    // Try SkyReels first
    if (provider === 'skyreels' || provider === 'skyreels-text') {
      console.log(`🎬 Submitting avatar video generation to SkyReels...`);

      let skyreelsResult;
      
      if (provider === 'skyreels-text') {
        skyreelsResult = await skyreelsService.generateTextToVideo({
          avatarImage: avatarImage || undefined,
          audioUrl,
          text: script,
          prompt: prompt || 'A person speaks naturally and engagingly to the camera. Use a static shot.'
        });
      } else {
        if (!avatarImage) {
          return res.status(400).json({
            success: false,
            message: 'Avatar image is required for Image-to-Video generation'
          });
        }
        
        skyreelsResult = await skyreelsService.generateVideo({
          avatarImage,
          audioUrl,
          prompt: prompt || 'The person speaks naturally and engagingly to the camera. Use a static shot.'
        });
      }

      if (skyreelsResult.status === 'success' && skyreelsResult.requestId) {
        result = {
          provider: 'skyreels',
          requestId: skyreelsResult.requestId,
          status: 'processing'
        };
        console.log(`✅ SkyReels request submitted: ${skyreelsResult.requestId}`);
      } else {
        lastError = skyreelsResult.error || 'SkyReels failed';
        console.warn(`⚠️ SkyReels failed: ${lastError}`);
      }
    }

    // Fallback to HeyGen if SkyReels failed or if provider is heygen
    if (!result && heygenService.isAvailable()) {
      console.log(`🎬 Trying HeyGen as fallback...`);

      const heygenResult = await heygenService.generateVideo({
        avatarImage: avatarImage || undefined,
        audioUrl,
        text: script,
        prompt: prompt || 'A person speaks naturally and engagingly to the camera.'
      });

      if (heygenResult.status === 'processing' && heygenResult.videoId) {
        result = {
          provider: 'heygen',
          requestId: heygenResult.videoId,
          status: 'processing'
        };
        console.log(`✅ HeyGen request submitted: ${heygenResult.videoId}`);
      } else {
        lastError = heygenResult.error || 'HeyGen failed';
        console.warn(`⚠️ HeyGen failed: ${lastError}`);
      }
    } else if (!result && !heygenService.isAvailable()) {
      lastError = 'HeyGen API not configured. Please add HEYGEN_API_KEY to .env file.';
    }

    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate avatar video',
        error: lastError || 'All avatar providers failed',
        hint: 'Try Standard Video mode instead, or configure HeyGen API key for avatar generation'
      });
    }

    // Create video record in database
    const videoId = generateUUID();
    const title = script ? `${script.substring(0, 50)}...` : 'Avatar Video';

    await query(
      `INSERT INTO videos (id, user_id, title, niche, duration, visual_style, status, scenes, metadata, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoId,
        userId,
        title,
        'avatar-video',
        30,
        'avatar',
        'generating',
        JSON.stringify([{ id: '1', type: 'avatar', provider: result.provider, requestId: result.requestId }]),
        JSON.stringify({
          requestId: result.requestId,
          provider: result.provider,
          avatarImage,
          audioSource,
          script,
          voiceName,
          language,
          prompt
        }),
        result.requestId
      ]
    );

    console.log(`✅ Avatar video request submitted: ${result.requestId}`);
    console.log(`   Video ID: ${videoId}`);
    console.log(`   Provider: ${result.provider}`);

    // Start background polling based on provider
    const pollPromise = result.provider === 'heygen'
      ? heygenService.waitForCompletion(result.requestId, 600000, 10000)
      : skyreelsService.waitForCompletion(result.requestId, 600000, 10000);

    pollPromise
      .then(async (videoPath) => {
        if (videoPath) {
          const backendPort = process.env.PORT || '3001';
          const videoUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/renders/${path.basename(videoPath)}`;

          await query(
            `UPDATE videos SET status = ?, video_url = ?, metadata = json_set(metadata, '$.videoUrl', ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['completed', videoUrl, videoUrl, videoId]
          );

          console.log(`✅ Avatar video completed: ${videoUrl}`);
        } else {
          await query(
            `UPDATE videos SET status = ?, metadata = json_set(metadata, '$.error', 'Generation failed'), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['failed', videoId]
          );
          console.error(`❌ Avatar video generation failed for: ${result.requestId}`);
        }
      })
      .catch(async (error) => {
        await query(
          `UPDATE videos SET status = ?, metadata = json_set(metadata, '$.error', ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          ['failed', error.message, videoId]
        );
        console.error(`❌ Avatar video error: ${error.message}`);
      });

    res.status(201).json({
      success: true,
      videoId,
      requestId: result.requestId,
      provider: result.provider,
      message: 'Avatar video generation started',
      status: 'processing',
      content: {
        title,
        audioUrl,
        avatarImage
      }
    });

  } catch (error: any) {
    console.error('Avatar video generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate avatar video',
      error: error.message
    });
  }
};

export const getAvatarStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if user owns this video
    const result = await query(
      'SELECT * FROM videos WHERE request_id = ? AND user_id = ?',
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const video = result.rows[0];
    
    // Get provider from metadata
    let provider = 'skyreels';
    try {
      const metadata = typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata;
      provider = metadata?.provider || 'skyreels';
    } catch (e) {
      // Default to skyreels
    }

    const skyreelsService = getSkyreelsService();
    const heygenService = getHeyGenService();

    let statusResult: any;

    if (provider === 'heygen') {
      statusResult = await heygenService.checkStatus(requestId);
    } else {
      statusResult = await skyreelsService.checkStatus(requestId);
    }

    // Update database status if changed
    if (statusResult.status !== 'processing') {
      await query(
        `UPDATE videos SET status = ?, metadata = json_set(metadata, '$.status', ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [statusResult.status, statusResult.status, video.id]
      );
    }

    res.status(200).json({
      success: true,
      requestId,
      provider,
      status: statusResult.status,
      videoId: video.id,
      videoStatus: video.status,
      error: statusResult.error
    });

  } catch (error: any) {
    console.error('Get avatar status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get status',
      error: error.message
    });
  }
};

export const getAvatarResult = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if user owns this video
    const result = await query(
      'SELECT * FROM videos WHERE request_id = ? AND user_id = ?',
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    const video = result.rows[0];
    
    // Get provider from metadata
    let provider = 'skyreels';
    try {
      const metadata = typeof video.metadata === 'string' ? JSON.parse(video.metadata) : video.metadata;
      provider = metadata?.provider || 'skyreels';
    } catch (e) {
      // Default to skyreels
    }

    const skyreelsService = getSkyreelsService();
    const heygenService = getHeyGenService();

    if (provider === 'heygen') {
      // HeyGen has different response format
      const heygenStatus = await heygenService.checkStatus(requestId);
      
      if (heygenStatus.data.status === 'completed' && heygenStatus.data.video_url) {
        // Download HeyGen video
        const videoPath = await heygenService.downloadVideo(heygenStatus.data.video_url, requestId);
        
        if (videoPath) {
          const backendPort = process.env.PORT || '3001';
          const videoUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/renders/${path.basename(videoPath)}`;

          await query(
            `UPDATE videos SET status = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['completed', videoUrl, video.id]
          );

          return res.status(200).json({
            success: true,
            requestId,
            provider: 'heygen',
            status: 'success',
            videoUrl
          });
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Video not ready',
        status: heygenStatus.data.status,
        error: heygenStatus.data.error || 'Generation in progress'
      });
    } else {
      // SkyReels handling
      const resultData = await skyreelsService.getResult(requestId);

      if (resultData.status !== 'success' || !resultData.videoList) {
        return res.status(400).json({
          success: false,
          message: 'Video not ready',
          status: resultData.status,
          error: resultData.error
        });
      }

      res.status(200).json({
        success: true,
        requestId,
        provider: 'skyreels',
        status: 'success',
        videos: resultData.videoList,
        usage: resultData.usage
      });
    }

  } catch (error: any) {
    console.error('Get avatar result error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get result',
      error: error.message
    });
  }
};

export const generateTextToAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const {
      text,
      audioSource,
      voiceName,
      language,
      speakingRate,
      prompt,
      customAudioUrl
    } = req.body as TextToAvatarRequest;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required for text-to-avatar' });
    }

    if (!audioSource) {
      return res.status(400).json({ success: false, message: 'Audio source is required' });
    }

    console.log(`🎬 Generating text-to-avatar video for user ${userId}`);
    console.log(`   Audio source: ${audioSource}`);
    console.log(`   Text: ${text.substring(0, 50)}...`);

    const ttsService = getTTSService();
    const skyreelsService = getSkyreelsService();

    let audioUrl: string;

    if (audioSource === 'tts') {
      console.log(`🔊 Generating TTS audio for text: "${text?.substring(0, 50)}..."`);

      const ttsResult = await ttsService.synthesize({
        text: text || '',
        languageCode: language || 'en-US',
        voiceName: voiceName || 'en-US-JennyNeural',
        speakingRate: speakingRate || 1.0,
        pitch: 0,
      });

      if (!ttsResult.audioUrl || ttsResult.isMock) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate audio for avatar video',
          error: 'TTS generation failed'
        });
      }

      audioUrl = ttsResult.audioUrl;
      console.log(`✅ TTS audio generated: ${audioUrl}`);
    } else {
      if (!customAudioUrl) {
        return res.status(400).json({ success: false, message: 'Audio file URL is required for upload source' });
      }
      audioUrl = customAudioUrl;
      console.log(`📎 Using uploaded audio: ${audioUrl}`);
    }

    console.log(`🎬 Submitting text-to-avatar video generation to SkyReels...`);

    const skyreelsResult = await skyreelsService.generateTextToVideo({
      text,
      audioUrl,
      prompt: prompt || 'A person speaks naturally and engagingly to the camera. Use a static shot.'
    });

    if (skyreelsResult.status === 'error' || !skyreelsResult.requestId) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate text-to-avatar video',
        error: skyreelsResult.error || 'Unknown error'
      });
    }

    const requestId = skyreelsResult.requestId;

    const videoId = generateUUID();
    const title = `${text.substring(0, 50)}...`;

    await query(
      `INSERT INTO videos (id, user_id, title, niche, duration, visual_style, status, scenes, metadata, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        videoId,
        userId,
        title,
        'text-to-avatar',
        30,
        'avatar',
        'generating',
        JSON.stringify([{ id: '1', type: 'text-to-avatar', requestId }]),
        JSON.stringify({
          requestId,
          text,
          audioSource,
          voiceName,
          language,
          prompt
        }),
        requestId
      ]
    );

    console.log(`✅ Text-to-avatar video request submitted: ${requestId}`);
    console.log(`   Video ID: ${videoId}`);

    skyreelsService.waitForCompletion(requestId, 600000, 10000)
      .then(async (videoPath) => {
        if (videoPath) {
          const backendPort = process.env.PORT || '3001';
          const videoUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/renders/${path.basename(videoPath)}`;

          await query(
            `UPDATE videos SET status = ?, video_url = ?, metadata = json_set(metadata, '$.videoUrl', ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['completed', videoUrl, videoUrl, videoId]
          );

          console.log(`✅ Text-to-avatar video completed: ${videoUrl}`);
        } else {
          await query(
            `UPDATE videos SET status = ?, metadata = json_set(metadata, '$.error', 'Generation failed'), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['failed', videoId]
          );
          console.error(`❌ Text-to-avatar video generation failed for: ${requestId}`);
        }
      })
      .catch(async (error) => {
        await query(
          `UPDATE videos SET status = ?, metadata = json_set(metadata, '$.error', ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          ['failed', error.message, videoId]
        );
        console.error(`❌ Text-to-avatar video error: ${error.message}`);
      });

      res.status(201).json({
        success: true,
        videoId,
        requestId,
        message: 'Text-to-avatar video generation started',
        status: 'processing',
        content: {
          title,
          audioUrl,
          text
        }
      });

    } catch (error: any) {
      console.error('Text-to-avatar video generation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate text-to-avatar video',
        error: error.message
      });
    }
  };

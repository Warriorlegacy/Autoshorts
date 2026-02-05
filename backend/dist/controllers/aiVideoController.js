"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testAIVideoProvider = exports.getAIVideoProviders = exports.checkAIVideoStatus = exports.generateAIVideo = void 0;
const db_1 = require("../config/db");
const bytezVideoService_1 = require("../services/bytezVideoService");
const falVideoService_1 = require("../services/falVideoService");
const replicateVideoService_1 = require("../services/replicateVideoService");
const heygenService_1 = require("../services/heygenService");
const skyreelsService_1 = require("../services/skyreelsService");
const bytezVideoService_2 = require("../services/bytezVideoService");
const falVideoService_2 = require("../services/falVideoService");
const replicateVideoService_2 = require("../services/replicateVideoService");
const crypto_1 = __importDefault(require("crypto"));
const generateUUID = () => crypto_1.default.randomUUID();
const generateAIVideo = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { prompt, provider = 'bytez', model, duration, width, height, negativePrompt, seed } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: 'Prompt is required' });
        }
        console.log(`🎬 AI Video Generation Request:`);
        console.log(`   User: ${userId}`);
        console.log(`   Provider: ${provider}`);
        console.log(`   Model: ${model || 'default'}`);
        console.log(`   Prompt: "${prompt.substring(0, 100)}..."`);
        let result;
        switch (provider) {
            case 'bytez':
                result = await generateBytezVideo({
                    prompt,
                    model: model || bytezVideoService_2.BYTEZ_VIDEO_MODELS.DEFAULT,
                    duration,
                    width,
                    height
                });
                break;
            case 'fal':
                result = await generateFalVideo({
                    prompt,
                    model: model || falVideoService_2.FAL_VIDEO_MODELS.DEFAULT,
                    duration,
                    width,
                    height,
                    negativePrompt
                });
                break;
            case 'replicate':
                result = await generateReplicateVideo({
                    prompt,
                    model: model || replicateVideoService_2.REPLICATE_VIDEO_MODELS.DEFAULT,
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
        await (0, db_1.query)(`INSERT INTO videos (id, user_id, title, caption, niche, language, duration, visual_style, status, video_url, scenes, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
        ]);
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
    }
    catch (error) {
        console.error('AI Video generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate AI video',
            error: error.message
        });
    }
};
exports.generateAIVideo = generateAIVideo;
async function generateBytezVideo(options) {
    const service = (0, bytezVideoService_1.getBytezVideoService)();
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
async function generateFalVideo(options) {
    const service = (0, falVideoService_1.getFalVideoService)();
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
async function generateReplicateVideo(options) {
    const service = (0, replicateVideoService_1.getReplicateVideoService)();
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
async function generateHeyGenVideo(options) {
    const service = (0, heygenService_1.getHeyGenService)();
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
async function generateSkyReelsVideo(options) {
    const service = (0, skyreelsService_1.getSkyreelsService)();
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
const checkAIVideoStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { requestId } = req.params;
        const { provider } = req.query;
        if (!requestId) {
            return res.status(400).json({ success: false, message: 'Request ID is required' });
        }
        let result;
        switch (provider) {
            case 'bytez': {
                const bytezResult = await (0, bytezVideoService_1.getBytezVideoService)().checkStatus(requestId);
                result = { status: bytezResult.status, videoUrl: bytezResult.videoUrl, error: bytezResult.error };
                break;
            }
            case 'fal': {
                const falResult = await (0, falVideoService_1.getFalVideoService)().checkStatus(requestId);
                result = { status: falResult.status, videoUrl: falResult.videoUrl, error: falResult.error };
                break;
            }
            case 'replicate': {
                const replResult = await (0, replicateVideoService_1.getReplicateVideoService)().checkStatus(requestId);
                result = { status: replResult.status, videoUrl: replResult.videoUrl, error: replResult.error };
                break;
            }
            case 'heygen': {
                const heygenResult = await (0, heygenService_1.getHeyGenService)().checkStatus(requestId);
                result = {
                    status: heygenResult.data.status === 'completed' ? 'success' : heygenResult.data.status,
                    videoUrl: heygenResult.data.video_url,
                    error: heygenResult.data.error
                };
                break;
            }
            case 'skyreels': {
                const skyResult = await (0, skyreelsService_1.getSkyreelsService)().checkStatus(requestId);
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
    }
    catch (error) {
        console.error('Check AI video status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check video status',
            error: error.message
        });
    }
};
exports.checkAIVideoStatus = checkAIVideoStatus;
const getAIVideoProviders = async (req, res) => {
    try {
        const bytezService = (0, bytezVideoService_1.getBytezVideoService)();
        const falService = (0, falVideoService_1.getFalVideoService)();
        const replicateService = (0, replicateVideoService_1.getReplicateVideoService)();
        const heygenService = (0, heygenService_1.getHeyGenService)();
        const skyreelsService = (0, skyreelsService_1.getSkyreelsService)();
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
                        id: bytezVideoService_2.BYTEZ_VIDEO_MODELS.DEFAULT,
                        name: 'ModelScope',
                        description: 'High-quality text-to-video, 576x320',
                        type: 'free'
                    },
                    {
                        id: bytezVideoService_2.BYTEZ_VIDEO_MODELS.ZEROSCOPE,
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
                        id: falVideoService_2.FAL_VIDEO_MODELS.MOCHI,
                        name: 'Mochi 1',
                        description: 'Open source high-quality video, 2-4 sec, 30fps',
                        type: 'paid'
                    },
                    {
                        id: falVideoService_2.FAL_VIDEO_MODELS.LTX_VIDEO,
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
                        id: replicateVideoService_2.REPLICATE_VIDEO_MODELS.COGVIDEO_9B,
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
    }
    catch (error) {
        console.error('Get AI video providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get providers',
            error: error.message
        });
    }
};
exports.getAIVideoProviders = getAIVideoProviders;
const testAIVideoProvider = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        const { provider } = req.body;
        if (!provider) {
            return res.status(400).json({ success: false, message: 'Provider is required' });
        }
        const testPrompt = 'A cat walking through a garden, cinematic lighting, high quality';
        console.log(`🧪 Testing ${provider} video generation...`);
        let result;
        switch (provider) {
            case 'bytez':
                result = await (0, bytezVideoService_1.getBytezVideoService)().generateVideo({
                    prompt: testPrompt,
                    model: bytezVideoService_2.BYTEZ_VIDEO_MODELS.DEFAULT
                });
                break;
            case 'fal':
                result = await (0, falVideoService_1.getFalVideoService)().generateVideo({
                    prompt: testPrompt,
                    model: falVideoService_2.FAL_VIDEO_MODELS.DEFAULT
                });
                break;
            case 'replicate':
                result = await (0, replicateVideoService_1.getReplicateVideoService)().generateVideo({
                    prompt: testPrompt,
                    model: replicateVideoService_2.REPLICATE_VIDEO_MODELS.COGVIDEO
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
    }
    catch (error) {
        console.error('Test AI video provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to test provider',
            error: error.message
        });
    }
};
exports.testAIVideoProvider = testAIVideoProvider;
exports.default = {
    generateAIVideo: exports.generateAIVideo,
    checkAIVideoStatus: exports.checkAIVideoStatus,
    getAIVideoProviders: exports.getAIVideoProviders,
    testAIVideoProvider: exports.testAIVideoProvider
};
//# sourceMappingURL=aiVideoController.js.map
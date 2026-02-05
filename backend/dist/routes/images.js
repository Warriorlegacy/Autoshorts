"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const imageService_1 = require("../services/imageService");
const router = (0, express_1.Router)();
const imageService = (0, imageService_1.getImageGenerationService)();
// All image routes require authentication
router.use(authMiddleware_1.authMiddleware);
/**
 * POST /api/images/generate
 * Generate a background image for a video scene
 */
router.post('/generate', async (req, res) => {
    try {
        const { prompt, style, aspectRatio, quality, provider, model } = req.body;
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Prompt field is required and must be a non-empty string',
                },
            });
        }
        if (style && !['cinematic', 'animated', 'minimalist', 'documentary', 'stock'].includes(style)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STYLE',
                    message: 'Style must be one of: cinematic, animated, minimalist, documentary, stock',
                },
            });
        }
        const result = await imageService.generateImage({
            prompt: prompt.trim(),
            style: style || 'cinematic',
            aspectRatio: aspectRatio || '9:16',
            quality: quality || 'high',
            provider: provider,
            model: model,
        });
        res.json({
            success: true,
            image: {
                url: result.imageUrl,
                prompt: result.prompt,
                style: result.style,
                generatedAt: result.generatedAt,
            },
            message: 'Image generated successfully',
        });
    }
    catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'IMAGE_GENERATION_FAILED',
                message: error instanceof Error ? error.message : 'Failed to generate image',
            },
        });
    }
});
/**
 * POST /api/images/batch
 * Generate multiple background images
 */
router.post('/batch', async (req, res) => {
    try {
        const { prompts, style, aspectRatio, quality } = req.body;
        if (!Array.isArray(prompts) || prompts.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Prompts field is required and must be a non-empty array',
                },
            });
        }
        if (prompts.length > 10) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BATCH_TOO_LARGE',
                    message: 'Maximum 10 prompts per batch',
                },
            });
        }
        const results = await imageService.generateBatch(prompts, style || 'cinematic');
        res.json({
            success: true,
            images: results.map((r) => ({
                url: r.imageUrl,
                prompt: r.prompt,
                style: r.style,
            })),
            count: results.length,
            message: 'Batch image generation completed successfully',
        });
    }
    catch (error) {
        console.error('Error in batch image generation:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'IMAGE_GENERATION_FAILED',
                message: error instanceof Error ? error.message : 'Failed to process batch',
            },
        });
    }
});
/**
 * GET /api/images/stock-suggestions
 * Get stock image search suggestions for a scene
 */
router.get('/stock-suggestions', async (req, res) => {
    try {
        const { niche, sceneDescription } = req.query;
        if (!niche || typeof niche !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Niche parameter is required',
                },
            });
        }
        const suggestions = await imageService.getStockImageSuggestions(niche, sceneDescription || '');
        res.json({
            success: true,
            niche,
            suggestions,
            count: suggestions.length,
            message: 'Stock image suggestions generated successfully',
        });
    }
    catch (error) {
        console.error('Error getting stock suggestions:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SUGGESTION_FAILED',
                message: error instanceof Error ? error.message : 'Failed to generate suggestions',
            },
        });
    }
});
/**
 * POST /api/images/stock-suggestions
 * Get stock image suggestions with scene context
 */
router.post('/stock-suggestions', async (req, res) => {
    try {
        const { niche, sceneDescription } = req.body;
        if (!niche || typeof niche !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Niche field is required',
                },
            });
        }
        const suggestions = await imageService.getStockImageSuggestions(niche, sceneDescription || '');
        res.json({
            success: true,
            niche,
            suggestions,
            count: suggestions.length,
            message: 'Stock image suggestions generated successfully',
        });
    }
    catch (error) {
        console.error('Error getting stock suggestions:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SUGGESTION_FAILED',
                message: error instanceof Error ? error.message : 'Failed to generate suggestions',
            },
        });
    }
});
/**
 * GET /api/images/styles
 * Get available image styles
 */
router.get('/styles', (req, res) => {
    const styles = [
        {
            id: 'cinematic',
            name: 'Cinematic',
            description: 'Professional film quality with dramatic lighting',
        },
        {
            id: 'animated',
            name: 'Animated',
            description: 'Vibrant motion graphics and dynamic compositions',
        },
        {
            id: 'minimalist',
            name: 'Minimalist',
            description: 'Clean lines and simple, modern aesthetic',
        },
        {
            id: 'documentary',
            name: 'Documentary',
            description: 'Educational and professional photography style',
        },
        {
            id: 'stock',
            name: 'Stock Photo',
            description: 'Professional commercial photography quality',
        },
    ];
    res.json({
        success: true,
        styles,
        count: styles.length,
    });
});
/**
 * GET /api/images/providers
 * Get available image generation providers and their models
 */
router.get('/providers', (req, res) => {
    const providers = [
        {
            id: 'pollinations',
            name: 'Pollinations AI',
            description: '100% FREE - No API key needed, unlimited generations',
            requiresKey: false,
            models: [
                { id: 'default', name: 'Default', description: 'Best quality settings' }
            ]
        },
        {
            id: 'huggingface',
            name: 'Hugging Face',
            description: 'FREE TIER - 1,000 requests/month with API key',
            requiresKey: true,
            keyName: 'HUGGINGFACE_API_KEY',
            models: [
                { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0', description: 'High quality, 1024x1024' },
                { id: 'runwayml/stable-diffusion-v1-5', name: 'SD 1.5', description: 'Classic stable diffusion' },
            ]
        },
        {
            id: 'replicate',
            name: 'Replicate (Flux)',
            description: 'FREE TIER - Various models including Flux',
            requiresKey: true,
            keyName: 'REPLICATE_API_KEY',
            models: [
                { id: 'black-forest-labs/flux-1-schnell', name: 'Flux Schnell', description: 'Fast generation' },
                { id: 'black-forest-labs/flux-1-dev', name: 'Flux Dev', description: 'Higher quality' },
            ]
        },
    ];
    res.json({
        success: true,
        providers,
        count: providers.length,
    });
});
exports.default = router;
//# sourceMappingURL=images.js.map
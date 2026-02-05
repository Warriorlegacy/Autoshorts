"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const ttsService_1 = require("../services/ttsService");
const router = (0, express_1.Router)();
const ttsService = (0, ttsService_1.getTTSService)();
// All TTS routes require authentication
router.use(authMiddleware_1.authMiddleware);
/**
 * POST /api/tts/synthesize
 * Generate speech from text
 */
router.post('/synthesize', async (req, res) => {
    try {
        const { text, languageCode, voiceName, ssmlGender, speakingRate, pitch } = req.body;
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Text field is required and must be a non-empty string',
                },
            });
        }
        const result = await ttsService.synthesize({
            text: text.trim(),
            languageCode: languageCode || 'en-US',
            voiceName: voiceName || 'en-US-Neural2-C',
            ssmlGender: ssmlGender || 'NEUTRAL',
            speakingRate: speakingRate ? parseFloat(speakingRate) : 1.0,
            pitch: pitch ? parseFloat(pitch) : 0,
        });
        res.json({
            success: true,
            audioUrl: result.audioUrl,
            duration: result.duration,
            message: 'Text synthesized successfully',
        });
    }
    catch (error) {
        console.error('Error in TTS synthesize:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'TTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to synthesize text',
            },
        });
    }
});
/**
 * POST /api/tts/synthesize-ssml
 * Generate speech from SSML (Speech Synthesis Markup Language)
 */
router.post('/synthesize-ssml', async (req, res) => {
    try {
        const { ssml, languageCode, voiceName } = req.body;
        if (!ssml || typeof ssml !== 'string' || ssml.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'SSML field is required and must be a non-empty string',
                },
            });
        }
        const result = await ttsService.synthesizeSSML(ssml.trim(), languageCode || 'en-US', voiceName || 'en-US-Neural2-C');
        res.json({
            success: true,
            audioUrl: result.audioUrl,
            duration: result.duration,
            message: 'SSML synthesized successfully',
        });
    }
    catch (error) {
        console.error('Error in TTS synthesize-ssml:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'TTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to synthesize SSML',
            },
        });
    }
});
/**
 * GET /api/tts/voices
 * Get available voices, optionally filtered by language
 */
router.get('/voices', async (req, res) => {
    try {
        const languageCode = req.query.languageCode || undefined;
        const voices = await ttsService.getAvailableVoices(languageCode);
        res.json({
            success: true,
            voices,
            count: voices.length,
            message: 'Voices fetched successfully',
        });
    }
    catch (error) {
        console.error('Error fetching voices:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'TTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch voices',
            },
        });
    }
});
/**
 * GET /api/tts/voices/:languageCode
 * Get voices for a specific language
 */
router.get('/voices/:languageCode', async (req, res) => {
    try {
        const { languageCode } = req.params;
        const voices = await ttsService.getAvailableVoices(languageCode);
        res.json({
            success: true,
            languageCode,
            voices,
            count: voices.length,
            message: `Voices for ${languageCode} fetched successfully`,
        });
    }
    catch (error) {
        console.error('Error fetching voices:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'TTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch voices',
            },
        });
    }
});
/**
 * POST /api/tts/batch
 * Generate multiple audio files in one request
 */
router.post('/batch', async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Items field is required and must be a non-empty array',
                },
            });
        }
        if (items.length > 10) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'BATCH_TOO_LARGE',
                    message: 'Maximum 10 items per batch',
                },
            });
        }
        const results = await Promise.allSettled(items.map((item) => ttsService.synthesize({
            text: item.text,
            languageCode: item.languageCode || 'en-US',
            voiceName: item.voiceName || 'en-US-Neural2-C',
            ssmlGender: item.ssmlGender || 'NEUTRAL',
            speakingRate: item.speakingRate || 1.0,
            pitch: item.pitch || 0,
        })));
        // Separate successful and failed results
        const successful = results
            .map((r, index) => ({
            index,
            status: r.status,
            result: r.status === 'fulfilled' ? r.value : null,
            error: r.status === 'rejected' ? r.reason : null,
        }))
            .filter(r => r.status === 'fulfilled');
        const failed = results
            .map((r, index) => ({
            index,
            status: r.status,
            error: r.status === 'rejected' ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : null,
        }))
            .filter(r => r.status === 'rejected');
        res.json({
            success: failed.length === 0,
            totalRequested: items.length,
            successful: successful.length,
            failed: failed.length,
            results: successful.map((s) => ({
                audioUrl: s.result?.audioUrl,
                duration: s.result?.duration,
            })),
            failedItems: failed.length > 0 ? failed.map(f => ({ index: f.index, error: f.error })) : undefined,
            count: successful.length,
            message: failed.length === 0 ? 'Batch synthesis completed successfully' : `Batch synthesis completed with ${failed.length} failures`,
        });
    }
    catch (error) {
        console.error('Error in batch synthesis:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'TTS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to process batch',
            },
        });
    }
});
exports.default = router;
//# sourceMappingURL=tts.js.map
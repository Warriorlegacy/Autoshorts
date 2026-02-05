"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNiches = exports.getSuggestedTopics = exports.generateScriptFromTopic = void 0;
const topicScriptService_1 = require("../services/topicScriptService");
/**
 * Generate a complete script from a topic/keyword
 */
const generateScriptFromTopic = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { topic, niche, tone, length, language } = req.body;
        if (!topic || topic.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Topic must be at least 3 characters long'
            });
        }
        console.log(`📝 Generating script for topic: "${topic}"`);
        const topicScriptService = (0, topicScriptService_1.getTopicScriptService)();
        if (!topicScriptService.isAvailable()) {
            return res.status(503).json({
                success: false,
                message: 'Script generation service is not configured',
                error: 'Groq API key required for AI script generation',
                hint: 'Add GROQ_API_KEY to .env file'
            });
        }
        const script = await topicScriptService.generateScript({
            topic: topic.trim(),
            niche,
            tone,
            length,
            language
        });
        if (!script) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate script',
                error: 'AI generation failed, please try again'
            });
        }
        // Store in history if user is logged in
        if (userId) {
            try {
                const { query } = await Promise.resolve().then(() => __importStar(require('../config/db')));
                const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
                await query(`INSERT INTO videos (id, user_id, title, niche, duration, visual_style, status, scenes, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    crypto.randomUUID(),
                    userId,
                    script.title,
                    niche || 'General',
                    script.estimatedDuration,
                    'script-generated',
                    'draft',
                    JSON.stringify([{ type: 'script', topic, script }]),
                    JSON.stringify({
                        scriptData: script,
                        generatedAt: new Date().toISOString()
                    })
                ]);
            }
            catch (dbError) {
                console.warn('Failed to save script to history:', dbError);
            }
        }
        res.status(200).json({
            success: true,
            data: script,
            message: 'Script generated successfully'
        });
    }
    catch (error) {
        console.error('Script generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate script',
            error: error.message
        });
    }
};
exports.generateScriptFromTopic = generateScriptFromTopic;
/**
 * Get suggested topics for a niche
 */
const getSuggestedTopics = async (req, res) => {
    try {
        const { niche, count } = req.query;
        if (!niche) {
            return res.status(400).json({
                success: false,
                message: 'Niche is required'
            });
        }
        const topicScriptService = (0, topicScriptService_1.getTopicScriptService)();
        const topics = await topicScriptService.getSuggestedTopics(niche, parseInt(count) || 5);
        res.status(200).json({
            success: true,
            data: { topics },
            message: 'Topics fetched successfully'
        });
    }
    catch (error) {
        console.error('Get topics error:', error);
        // Return default topics on error
        const topicScriptService = (0, topicScriptService_1.getTopicScriptService)();
        const defaultTopics = topicScriptService.getDefaultTopics('General');
        res.status(200).json({
            success: true,
            data: { topics: defaultTopics },
            message: 'Default topics returned'
        });
    }
};
exports.getSuggestedTopics = getSuggestedTopics;
/**
 * Get available niches for topic generation
 */
const getNiches = async (_req, res) => {
    const niches = [
        { id: 'scary_stories', name: 'Scary Stories', icon: '👻', color: '#7c3aed' },
        { id: 'true_crime', name: 'True Crime', icon: '🔍', color: '#dc2626' },
        { id: 'real_tragedies', name: 'Real Tragedies', icon: '😢', color: '#4b5563' },
        { id: 'anime_stories', name: 'Anime Stories', icon: '🎌', color: '#ec4899' },
        { id: 'heists', name: 'Heists & Crimes', icon: '💰', color: '#059669' },
        { id: 'history', name: 'History & Facts', icon: '📚', color: '#d97706' },
        { id: 'motivation', name: 'Motivation & Self-Help', icon: '💪', color: '#2563eb' },
        { id: 'technology', name: 'Technology & AI', icon: '🤖', color: '#0ea5e9' },
        { id: 'science', name: 'Science & Discovery', icon: '🔬', color: '#8b5cf6' },
        { id: 'business', name: 'Business & Finance', icon: '💰', color: '#10b981' },
        { id: 'health', name: 'Health & Wellness', icon: '🏃', color: '#f43f5e' },
        { id: 'entertainment', name: 'Entertainment & Pop Culture', icon: '🎬', color: '#f59e0b' },
        { id: 'gaming', name: 'Gaming & Esports', icon: '🎮', color: '#6366f1' },
        { id: 'education', name: 'Education & Learning', icon: '📖', color: '#14b8a6' },
        { id: 'lifestyle', name: 'Lifestyle & DIY', icon: '🏠', color: '#84cc16' },
    ];
    res.status(200).json({
        success: true,
        data: { niches },
        message: 'Niches fetched successfully'
    });
};
exports.getNiches = getNiches;
//# sourceMappingURL=topicController.js.map
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { generateScriptFromTopic, getSuggestedTopics, getNiches } from '../controllers/topicController';

const router = Router();

/**
 * @route POST /api/topic/generate
 * @desc Generate a script from a topic/keyword
 * @access Private
 */
router.post('/generate', authenticateToken, generateScriptFromTopic);

/**
 * @route GET /api/topic/suggestions
 * @desc Get suggested topics for a niche
 * @access Public
 */
router.get('/suggestions', getSuggestedTopics);

/**
 * @route GET /api/topic/niches
 * @desc Get available niches for topic generation
 * @access Public
 */
router.get('/niches', getNiches);

export default router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const topicController_1 = require("../controllers/topicController");
const router = (0, express_1.Router)();
/**
 * @route POST /api/topic/generate
 * @desc Generate a script from a topic/keyword
 * @access Private
 */
router.post('/generate', auth_1.authenticateToken, topicController_1.generateScriptFromTopic);
/**
 * @route GET /api/topic/suggestions
 * @desc Get suggested topics for a niche
 * @access Public
 */
router.get('/suggestions', topicController_1.getSuggestedTopics);
/**
 * @route GET /api/topic/niches
 * @desc Get available niches for topic generation
 * @access Public
 */
router.get('/niches', topicController_1.getNiches);
exports.default = router;
//# sourceMappingURL=topic.js.map
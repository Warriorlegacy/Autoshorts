"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueRoutes = void 0;
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const videoController_1 = require("../controllers/videoController");
const textToVideoController_1 = require("../controllers/textToVideoController");
const aiVideoController_1 = require("../controllers/aiVideoController");
const queueController_1 = require("../controllers/queueController");
const avatar_1 = __importDefault(require("./avatar"));
const router = (0, express_1.Router)();
// All video routes require authentication
router.use(authMiddleware_1.authMiddleware);
// Mount avatar routes at /avatar
router.use('/avatar', avatar_1.default);
// Get available AI providers
router.get('/providers', videoController_1.getProviders);
// Generate new video (niche-based)
router.post('/generate', videoController_1.generateVideo);
// Generate text-to-video
router.post('/text-to-video', textToVideoController_1.generateTextToVideo);
// Preview video before generation
router.post('/preview', textToVideoController_1.previewVideo);
// AI Video Generation Routes
router.get('/ai-video/providers', aiVideoController_1.getAIVideoProviders);
router.post('/ai-video/generate', aiVideoController_1.generateAIVideo);
router.get('/ai-video/status/:requestId', aiVideoController_1.checkAIVideoStatus);
router.post('/ai-video/test', aiVideoController_1.testAIVideoProvider);
// Get single video by ID
router.get('/:videoId', videoController_1.getVideo);
// Regenerate existing video
router.post('/:videoId/regenerate', videoController_1.regenerateVideo);
// Queue operations
router.post('/:videoId/queue', queueController_1.addToQueue);
// Get video status
router.get('/:videoId/status', videoController_1.getVideoStatus);
// Get user's videos
router.get('/', videoController_1.getUserVideos);
// Delete video
router.delete('/:videoId', videoController_1.deleteVideo);
exports.default = router;
// Queue routes (can also be mounted separately if needed)
exports.queueRoutes = (0, express_1.Router)();
exports.queueRoutes.use(authMiddleware_1.authMiddleware);
exports.queueRoutes.get('/', queueController_1.getQueuedVideos);
exports.queueRoutes.delete('/:queueId', queueController_1.removeFromQueue);
exports.queueRoutes.put('/:queueId', queueController_1.updateQueueItem);
exports.queueRoutes.post('/:queueId/post-now', queueController_1.postNow);
//# sourceMappingURL=videos.js.map
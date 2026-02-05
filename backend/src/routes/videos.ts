import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  generateVideo,
  getVideo,
  getVideoStatus,
  getUserVideos,
  deleteVideo,
  regenerateVideo,
  getProviders
} from '../controllers/videoController';
import {
  generateTextToVideo,
  previewVideo
} from '../controllers/textToVideoController';
import {
  generateAIVideo,
  checkAIVideoStatus,
  getAIVideoProviders,
  testAIVideoProvider
} from '../controllers/aiVideoController';
import {
  addToQueue,
  getQueuedVideos,
  removeFromQueue,
  updateQueueItem,
  postNow
} from '../controllers/queueController';
import avatarRoutes from './avatar';

const router = Router();

// All video routes require authentication
router.use(authMiddleware);

// Mount avatar routes at /avatar
router.use('/avatar', avatarRoutes);

// Get available AI providers
router.get('/providers', getProviders);

// Generate new video (niche-based)
router.post('/generate', generateVideo);

// Generate text-to-video
router.post('/text-to-video', generateTextToVideo);

// Preview video before generation
router.post('/preview', previewVideo);

// AI Video Generation Routes
router.get('/ai-video/providers', getAIVideoProviders);
router.post('/ai-video/generate', generateAIVideo);
router.get('/ai-video/status/:requestId', checkAIVideoStatus);
router.post('/ai-video/test', testAIVideoProvider);

// Get single video by ID
router.get('/:videoId', getVideo);

// Regenerate existing video
router.post('/:videoId/regenerate', regenerateVideo);

// Queue operations
router.post('/:videoId/queue', addToQueue);

// Get video status
router.get('/:videoId/status', getVideoStatus);

// Get user's videos
router.get('/', getUserVideos);

// Delete video
router.delete('/:videoId', deleteVideo);

export default router;

// Queue routes (can also be mounted separately if needed)
export const queueRoutes = Router();
queueRoutes.use(authMiddleware);

queueRoutes.get('/', getQueuedVideos);
queueRoutes.delete('/:queueId', removeFromQueue);
queueRoutes.put('/:queueId', updateQueueItem);
queueRoutes.post('/:queueId/post-now', postNow);
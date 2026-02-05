import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { generateAvatarVideo, getAvatarStatus, getAvatarResult, generateTextToAvatar } from '../controllers/avatarController';

const router = Router();

// All avatar routes require authentication
router.use(authMiddleware);

// Generate avatar video (with provided avatar image)
router.post('/generate', generateAvatarVideo);

// Generate text-to-avatar video (AI-generated avatar from text)
router.post('/text-to-avatar', generateTextToAvatar);

// Check generation status
router.get('/status/:requestId', getAvatarStatus);

// Get generated video URL
router.get('/result/:requestId', getAvatarResult);

export default router;

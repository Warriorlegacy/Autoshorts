import express, { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { getSocialMediaService, SocialPlatform } from '../services/socialMediaService';

const router = express.Router();

router.use(async (req: any, res: Response, next) => {
  const authReq = req as AuthRequest;
  if (!authReq.user?.id) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }
  next();
});

router.get('/accounts', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const service = getSocialMediaService();
    const accounts = await service.getConnectedAccounts(userId!);

    res.status(200).json({
      success: true,
      accounts
    });
  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connected accounts',
      error: error.message
    });
  }
});

router.get('/status/:platform', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform } = req.params as { platform: SocialPlatform };
    const service = getSocialMediaService();
    const isConnected = await service.isConnected(userId!, platform);

    res.status(200).json({
      success: true,
      platform,
      isConnected
    });
  } catch (error: any) {
    console.error('Get platform status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get platform status',
      error: error.message
    });
  }
});

router.post('/disconnect/:platform', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { platform } = req.params as { platform: SocialPlatform };
    const service = getSocialMediaService();
    const success = await service.disconnect(userId!, platform);

    if (success) {
      res.status(200).json({
        success: true,
        message: `${platform} account disconnected successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to disconnect ${platform} account`
      });
    }
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account',
      error: error.message
    });
  }
});

router.post('/post', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { videoPath, title, description, hashtags, platforms } = req.body;

    if (!videoPath || !platforms || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Video path and at least one platform are required'
      });
    }

    const service = getSocialMediaService();
    const results = await service.postVideo({
      videoId: '',
      userId: userId!,
      videoPath,
      title: title || '',
      description: description || '',
      hashtags: hashtags || []
    }, platforms);

    const allSuccessful = results.every(r => r.success);

    res.status(200).json({
      success: allSuccessful,
      message: allSuccessful ? 'Video posted to all platforms' : 'Video posted with some errors',
      results
    });
  } catch (error: any) {
    console.error('Post video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post video',
      error: error.message
    });
  }
});

router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const service = getSocialMediaService();
    const history = await service.getUploadHistory(userId!, limit);

    res.status(200).json({
      success: true,
      history
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload history',
      error: error.message
    });
  }
});

export default router;

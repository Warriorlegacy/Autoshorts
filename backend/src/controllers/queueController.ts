import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query } from '../config/db';
import autoPostScheduler from '../services/autoPostScheduler';

interface QueueRequest {
  platforms: string[];
  scheduledAt: string;
}

interface QueuedVideoRecord {
  id: string;
  video_id: string;
  user_id: string;
  scheduled_at: string;
  platforms: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const addToQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const { platforms, scheduledAt } = req.body as QueueRequest;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate input
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one platform is required' });
    }

    if (!scheduledAt) {
      return res.status(400).json({ success: false, message: 'Scheduled date/time is required' });
    }

    // Verify video exists and belongs to user
    const videoResult = await query(
      'SELECT id FROM videos WHERE id = ? AND user_id = ?',
      [videoId, userId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check if video already in queue
    const existingQueue = await query(
      'SELECT id FROM video_queue WHERE video_id = ? AND user_id = ?',
      [videoId, userId]
    );

    if (existingQueue.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video is already in queue. Remove it first to reschedule.' 
      });
    }

    // Add to queue
    const result = await query(
      `INSERT INTO video_queue (user_id, video_id, scheduled_at, platforms, status)
       VALUES (?, ?, ?, ?, 'queued')
       RETURNING id, video_id, scheduled_at, platforms, status, created_at`,
      [userId, videoId, scheduledAt, JSON.stringify(platforms)]
    );

    const queueItem = result.rows[0];

    if (!queueItem || !queueItem.id) {
      return res.status(500).json({ success: false, message: 'Failed to add video to queue' });
    }

    console.log(`Video ${videoId} added to queue for platforms: ${platforms.join(', ')}`);

    res.status(201).json({
      success: true,
      queueId: queueItem.id,
      message: 'Video added to queue successfully',
      queueItem: {
        id: queueItem.id,
        videoId: queueItem.video_id,
        scheduledAt: queueItem.scheduled_at,
        platforms: JSON.parse(queueItem.platforms),
        status: queueItem.status,
        createdAt: queueItem.created_at
      }
    });

  } catch (error: any) {
    console.error('Add to queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add video to queue',
      error: error.message
    });
  }
};

export const getQueuedVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get queued videos with video details
    const result = await query(
      `SELECT 
         vq.id, vq.video_id, vq.scheduled_at, vq.platforms, vq.status, vq.created_at, vq.updated_at,
         v.title, v.caption, v.niche, v.duration, v.visual_style, v.video_url, v.thumbnail_url,
         COUNT(*) OVER() as total
       FROM video_queue vq
       JOIN videos v ON vq.video_id = v.id
       WHERE vq.user_id = ?
       ORDER BY vq.scheduled_at ASC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total, 10) : 0;

    const queuedVideos = result.rows.map((row: any) => ({
      id: row.id,
      videoId: row.video_id,
      title: row.title,
      caption: row.caption,
      niche: row.niche,
      duration: row.duration,
      visualStyle: row.visual_style,
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url,
      scheduledAt: row.scheduled_at,
      platforms: JSON.parse(row.platforms),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.status(200).json({
      success: true,
      queuedVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('Get queued videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queued videos',
      error: error.message
    });
  }
};

export const removeFromQueue = async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if queue item belongs to user
    const checkResult = await query(
      'SELECT id FROM video_queue WHERE id = ? AND user_id = ?',
      [queueId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Queue item not found' });
    }

    // Remove from queue
    await query('DELETE FROM video_queue WHERE id = ? AND user_id = ?', [queueId, userId]);

    console.log(`Queue item ${queueId} removed from queue`);

    res.status(200).json({
      success: true,
      message: 'Video removed from queue successfully'
    });

  } catch (error: any) {
    console.error('Remove from queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove video from queue',
      error: error.message
    });
  }
};

export const updateQueueItem = async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.params;
    const { scheduledAt, platforms } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if queue item belongs to user
    const checkResult = await query(
      'SELECT id FROM video_queue WHERE id = ? AND user_id = ?',
      [queueId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Queue item not found' });
    }

    // Update queue item
    const updates: string[] = [];
    const values: any[] = [];

    if (scheduledAt) {
      updates.push('scheduled_at = ?');
      values.push(scheduledAt);
    }

    if (platforms && Array.isArray(platforms)) {
      updates.push('platforms = ?');
      values.push(JSON.stringify(platforms));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(queueId, userId);

    await query(
      `UPDATE video_queue SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Queue item updated successfully'
    });

  } catch (error: any) {
    console.error('Update queue item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update queue item',
      error: error.message
    });
  }
};

export const postNow = async (req: AuthRequest, res: Response) => {
  try {
    const { queueId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const result = await autoPostScheduler.postNow(queueId, userId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }

  } catch (error: any) {
    console.error('Post now error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to post video immediately',
      error: error.message
    });
  }
};

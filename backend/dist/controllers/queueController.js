"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postNow = exports.updateQueueItem = exports.removeFromQueue = exports.getQueuedVideos = exports.addToQueue = void 0;
const db_1 = require("../config/db");
const autoPostScheduler_1 = __importDefault(require("../services/autoPostScheduler"));
const addToQueue = async (req, res) => {
    try {
        const { videoId } = req.params;
        const { platforms, scheduledAt } = req.body;
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
        const videoResult = await (0, db_1.query)('SELECT id FROM videos WHERE id = ? AND user_id = ?', [videoId, userId]);
        if (videoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }
        // Check if video already in queue
        const existingQueue = await (0, db_1.query)('SELECT id FROM video_queue WHERE video_id = ? AND user_id = ?', [videoId, userId]);
        if (existingQueue.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Video is already in queue. Remove it first to reschedule.'
            });
        }
        // Add to queue
        const result = await (0, db_1.query)(`INSERT INTO video_queue (user_id, video_id, scheduled_at, platforms, status)
       VALUES (?, ?, ?, ?, 'queued')
       RETURNING id, video_id, scheduled_at, platforms, status, created_at`, [userId, videoId, scheduledAt, JSON.stringify(platforms)]);
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
    }
    catch (error) {
        console.error('Add to queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add video to queue',
            error: error.message
        });
    }
};
exports.addToQueue = addToQueue;
const getQueuedVideos = async (req, res) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        // Get queued videos with video details
        const result = await (0, db_1.query)(`SELECT 
         vq.id, vq.video_id, vq.scheduled_at, vq.platforms, vq.status, vq.created_at, vq.updated_at,
         v.title, v.caption, v.niche, v.duration, v.visual_style, v.video_url, v.thumbnail_url,
         COUNT(*) OVER() as total
       FROM video_queue vq
       JOIN videos v ON vq.video_id = v.id
       WHERE vq.user_id = ?
       ORDER BY vq.scheduled_at ASC
       LIMIT ? OFFSET ?`, [userId, limit, offset]);
        const total = result.rows.length > 0 ? parseInt(result.rows[0].total, 10) : 0;
        const queuedVideos = result.rows.map((row) => ({
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
    }
    catch (error) {
        console.error('Get queued videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get queued videos',
            error: error.message
        });
    }
};
exports.getQueuedVideos = getQueuedVideos;
const removeFromQueue = async (req, res) => {
    try {
        const { queueId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        // Check if queue item belongs to user
        const checkResult = await (0, db_1.query)('SELECT id FROM video_queue WHERE id = ? AND user_id = ?', [queueId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Queue item not found' });
        }
        // Remove from queue
        await (0, db_1.query)('DELETE FROM video_queue WHERE id = ? AND user_id = ?', [queueId, userId]);
        console.log(`Queue item ${queueId} removed from queue`);
        res.status(200).json({
            success: true,
            message: 'Video removed from queue successfully'
        });
    }
    catch (error) {
        console.error('Remove from queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove video from queue',
            error: error.message
        });
    }
};
exports.removeFromQueue = removeFromQueue;
const updateQueueItem = async (req, res) => {
    try {
        const { queueId } = req.params;
        const { scheduledAt, platforms } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        // Check if queue item belongs to user
        const checkResult = await (0, db_1.query)('SELECT id FROM video_queue WHERE id = ? AND user_id = ?', [queueId, userId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Queue item not found' });
        }
        // Update queue item
        const updates = [];
        const values = [];
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
        await (0, db_1.query)(`UPDATE video_queue SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
        res.status(200).json({
            success: true,
            message: 'Queue item updated successfully'
        });
    }
    catch (error) {
        console.error('Update queue item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update queue item',
            error: error.message
        });
    }
};
exports.updateQueueItem = updateQueueItem;
const postNow = async (req, res) => {
    try {
        const { queueId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const result = await autoPostScheduler_1.default.postNow(queueId, userId);
        if (result.success) {
            res.status(200).json({
                success: true,
                message: result.message
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('Post now error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to post video immediately',
            error: error.message
        });
    }
};
exports.postNow = postNow;
//# sourceMappingURL=queueController.js.map
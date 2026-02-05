"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVideoPollingService = startVideoPollingService;
exports.stopVideoPollingService = stopVideoPollingService;
const db_1 = require("../config/db");
const unifiedVideoService_1 = require("./unifiedVideoService");
const POLLING_INTERVAL_MS = 30000;
const MAX_POLLING_ATTEMPTS = 120;
class VideoPollingService {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
    }
    start() {
        if (this.isRunning) {
            console.log('Video polling service already running');
            return;
        }
        this.isRunning = true;
        console.log('🎯 Starting video polling service...');
        this.pollOnce();
        this.intervalId = setInterval(() => {
            this.pollOnce();
        }, POLLING_INTERVAL_MS);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('Video polling service stopped');
    }
    async pollOnce() {
        try {
            const processingVideos = await this.getProcessingVideos();
            if (processingVideos.length === 0) {
                return;
            }
            console.log(`📊 Checking ${processingVideos.length} processing videos...`);
            for (const video of processingVideos) {
                await this.checkVideoStatus(video);
            }
        }
        catch (error) {
            console.error('Error in video polling:', error);
        }
    }
    async getProcessingVideos() {
        try {
            const result = await (0, db_1.query)(`SELECT id, metadata FROM videos
         WHERE status = 'processing'
         AND json_extract(metadata, '$.aiVideoProvider') IS NOT NULL
         AND json_extract(metadata, '$.aiVideoRequestId') IS NOT NULL
         AND (json_extract(metadata, '$.pollingAttempts') IS NULL OR json_extract(metadata, '$.pollingAttempts') < ?)`, [MAX_POLLING_ATTEMPTS]);
            return result.rows.map((row) => {
                const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
                return {
                    videoId: row.id,
                    requestId: metadata.aiVideoRequestId,
                    provider: metadata.aiVideoProvider,
                    attempts: metadata.pollingAttempts || 0
                };
            });
        }
        catch (error) {
            console.error('Error getting processing videos:', error);
            return [];
        }
    }
    async checkVideoStatus(video) {
        try {
            const service = (0, unifiedVideoService_1.getUnifiedVideoService)();
            const result = await service.checkStatus(video.requestId, video.provider);
            console.log(`📹 Video ${video.videoId}: ${result.status}`);
            if (result.status === 'success') {
                await this.updateVideoSuccess(video.videoId, result);
            }
            else if (result.status === 'error') {
                await this.updateVideoError(video.videoId, result.error || 'Video generation failed');
            }
            else {
                await this.incrementAttempts(video);
            }
        }
        catch (error) {
            console.error(`Error checking status for video ${video.videoId}:`, error);
            this.incrementAttempts(video);
        }
    }
    async updateVideoSuccess(videoId, result) {
        await (0, db_1.query)(`UPDATE videos SET
        status = 'completed',
        video_url = ?,
        metadata = json_set(COALESCE(metadata, '{}'), '$.pollingAttempts', 0),
        updated_at = datetime('now')
       WHERE id = ?`, [result.localPath || result.videoUrl || null, videoId]);
        console.log(`✅ Video ${videoId} completed!`);
    }
    async updateVideoError(videoId, error) {
        await (0, db_1.query)(`UPDATE videos SET
        status = 'failed',
        metadata = json_set(COALESCE(metadata, '{}'), '$.error', ?),
        updated_at = datetime('now')
       WHERE id = ?`, [error, videoId]);
        console.error(`❌ Video ${videoId} failed: ${error}`);
    }
    async incrementAttempts(video) {
        const newAttempts = video.attempts + 1;
        if (newAttempts >= MAX_POLLING_ATTEMPTS) {
            await this.updateVideoError(video.videoId, 'Polling timeout - video generation took too long');
            return;
        }
        await (0, db_1.query)(`UPDATE videos SET
        metadata = json_set(COALESCE(metadata, '{}'), '$.pollingAttempts', ?),
        updated_at = datetime('now')
       WHERE id = ?`, [newAttempts, video.videoId]);
    }
}
const pollingService = new VideoPollingService();
function startVideoPollingService() {
    pollingService.start();
}
function stopVideoPollingService() {
    pollingService.stop();
}
exports.default = pollingService;
//# sourceMappingURL=videoPollingService.js.map
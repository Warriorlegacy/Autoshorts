"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderingService = void 0;
const bundler_1 = require("@remotion/bundler");
const renderer_1 = require("@remotion/renderer");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../config/db");
class RenderingService {
    /**
     * Render a video based on its ID
     */
    async renderVideo(videoId) {
        try {
            console.log(`[Render] Starting render for video ID: ${videoId} (type: ${typeof videoId})`);
            // 1. Fetch video data from DB
            const result = await (0, db_1.query)('SELECT id, scenes, duration, visual_style FROM videos WHERE id = ?', [videoId]);
            console.log(`[Render] Query result: ${result.rows.length} rows found`);
            if (result.rows.length > 0) {
                console.log(`[Render] First row ID: ${result.rows[0].id} (type: ${typeof result.rows[0].id})`);
            }
            if (result.rows.length === 0) {
                throw new Error(`Video not found: ${videoId}`);
            }
            const videoData = result.rows[0];
            // Parse scenes if they're stored as JSON string
            let scenes = [];
            try {
                scenes = typeof videoData.scenes === 'string'
                    ? JSON.parse(videoData.scenes)
                    : videoData.scenes;
            }
            catch (e) {
                throw new Error('Invalid scenes data format');
            }
            if (!scenes || scenes.length === 0) {
                throw new Error('No scenes defined for video');
            }
            // Ensure public/renders directory exists
            const rendersDir = path_1.default.join(process.cwd(), 'public/renders');
            if (!fs_1.default.existsSync(rendersDir)) {
                fs_1.default.mkdirSync(rendersDir, { recursive: true });
            }
            const entry = path_1.default.join(process.cwd(), 'src/video-engine/index.ts');
            console.log(`Starting render for video ${videoId}...`);
            console.log(`Scenes: ${scenes.length}, Duration: ${videoData.duration}s`);
            // 2. Bundle the video-engine
            console.log('Bundling video engine...');
            const bundleLocation = await (0, bundler_1.bundle)({
                entryPoint: entry,
            });
            // 3. Select the composition
            console.log('Selecting composition...');
            const composition = await (0, renderer_1.selectComposition)({
                serveUrl: bundleLocation,
                id: 'ShortVideo',
                inputProps: {
                    scenes,
                    totalDuration: videoData.duration || 60,
                },
            });
            // 4. Set output path
            const outputLocation = path_1.default.join(rendersDir, `${videoId}.mp4`);
            console.log(`Output location: ${outputLocation}`);
            // 5. Render the media
            console.log('Rendering video...');
            await (0, renderer_1.renderMedia)({
                composition,
                serveUrl: bundleLocation,
                codec: 'h264',
                outputLocation,
                inputProps: {
                    scenes,
                    totalDuration: videoData.duration || 60,
                },
            });
            console.log(`Render complete: ${outputLocation}`);
            // 6. Update DB with video URL
            const videoUrl = `/renders/${videoId}.mp4`;
            const thumbnailUrl = `/renders/${videoId}.jpg`;
            await (0, db_1.query)("UPDATE videos SET status = ?, video_url = ?, thumbnail_url = ?, updated_at = datetime('now') WHERE id = ?", ['completed', videoUrl, thumbnailUrl, videoId]);
            console.log(`Video ${videoId} marked as completed in database`);
        }
        catch (error) {
            console.error(`Error rendering video ${videoId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            try {
                await (0, db_1.query)("UPDATE videos SET status = ?, metadata = ?, updated_at = datetime('now') WHERE id = ?", ['failed', JSON.stringify({ error: errorMessage }), videoId]);
            }
            catch (dbError) {
                console.error(`Failed to update video status in DB: ${dbError}`);
            }
            throw error; // Re-throw for caller to handle
        }
    }
    /**
     * Get rendering status
     */
    async getStatus(videoId) {
        try {
            const result = await (0, db_1.query)('SELECT status, video_url FROM videos WHERE id = ?', [videoId]);
            if (result.rows.length === 0) {
                throw new Error('Video not found');
            }
            const video = result.rows[0];
            return {
                status: video.status,
                videoUrl: video.video_url,
            };
        }
        catch (error) {
            console.error(`Error getting status for video ${videoId}:`, error);
            throw error;
        }
    }
}
exports.RenderingService = RenderingService;
//# sourceMappingURL=renderingService.js.map
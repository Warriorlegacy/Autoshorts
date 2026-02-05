"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnifiedVideoService = void 0;
exports.getUnifiedVideoService = getUnifiedVideoService;
const bytezVideoService_1 = require("./bytezVideoService");
const falVideoService_1 = require("./falVideoService");
const replicateVideoService_1 = require("./replicateVideoService");
const heygenService_1 = require("./heygenService");
const skyreelsService_1 = require("./skyreelsService");
const db_1 = require("../config/db");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = require("util");
class UnifiedVideoService {
    constructor() {
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    async generateVideo(options) {
        const { provider } = options;
        switch (provider) {
            case 'bytez':
                return this.generateBytez(options);
            case 'fal':
                return this.generateFal(options);
            case 'replicate':
                return this.generateReplicate(options);
            case 'heygen':
                return this.generateHeyGen(options);
            case 'skyreels':
                return this.generateSkyReels(options);
            default:
                return { success: false, requestId: '', status: 'error', error: `Unknown provider: ${provider}` };
        }
    }
    async generateBytez(options) {
        const service = (0, bytezVideoService_1.getBytezVideoService)();
        if (!service.isAvailable()) {
            return { success: false, requestId: '', status: 'error', error: 'Bytez not configured' };
        }
        const result = await service.generateVideo({
            prompt: options.prompt || '',
            model: options.model
        });
        if (result.status === 'success' && result.videoUrl) {
            const localPath = await this.downloadVideo(result.videoUrl, 'bytez');
            return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        return { success: result.status !== 'error', requestId: result.requestId, status: result.status, error: result.error };
    }
    async generateFal(options) {
        const service = (0, falVideoService_1.getFalVideoService)();
        if (!service.isAvailable()) {
            return { success: false, requestId: '', status: 'error', error: 'FAL not configured' };
        }
        const result = await service.generateVideo({
            prompt: options.prompt || '',
            model: options.model,
            duration: options.duration,
            width: options.width,
            height: options.height,
            negativePrompt: options.negativePrompt
        });
        if (result.status === 'success' && result.videoUrl) {
            const localPath = await this.downloadVideo(result.videoUrl, 'fal');
            return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        return { success: result.status !== 'error', requestId: result.requestId, status: result.status, error: result.error };
    }
    async generateReplicate(options) {
        const service = (0, replicateVideoService_1.getReplicateVideoService)();
        if (!service.isAvailable()) {
            return { success: false, requestId: '', status: 'error', error: 'Replicate not configured' };
        }
        const result = await service.generateVideo({
            prompt: options.prompt || '',
            model: options.model,
            numFrames: options.duration ? Math.floor(options.duration * 8) : 32,
            width: options.width || 480,
            height: options.height || 272
        });
        if (result.status === 'success' && result.videoUrl) {
            const localPath = await this.downloadVideo(result.videoUrl, 'replicate');
            return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        return { success: result.status !== 'error', requestId: result.requestId, status: result.status, error: result.error };
    }
    async generateHeyGen(options) {
        const service = (0, heygenService_1.getHeyGenService)();
        if (!service.isAvailable()) {
            return { success: false, requestId: '', status: 'error', error: 'HeyGen not configured' };
        }
        const result = await service.generateVideo({
            avatarId: options.avatarId,
            avatarImage: options.avatarImage,
            audioUrl: options.audioUrl || '',
            text: options.prompt
        });
        const status = result.status === 'completed' ? 'success' : result.status;
        if (status === 'success' && result.videoUrl) {
            const localPath = await service.downloadVideo(result.videoUrl, result.videoId);
            return { success: true, requestId: result.videoId, status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
        }
        return { success: status !== 'error', requestId: result.videoId, status, error: result.error };
    }
    async generateSkyReels(options) {
        const service = (0, skyreelsService_1.getSkyreelsService)();
        if (!service.isAvailable()) {
            return { success: false, requestId: '', status: 'error', error: 'SkyReels not configured' };
        }
        const result = await service.generateVideo({
            avatarImage: options.avatarImage,
            audioUrl: options.audioUrl || '',
            prompt: options.prompt
        });
        if (result.status === 'success') {
            return { success: true, requestId: result.requestId, status: 'success', videoUrl: result.videoUrl, error: result.error };
        }
        let skyStatus = 'processing';
        if (result.status === 'error' || result.status === 'failed') {
            skyStatus = 'error';
        }
        return { success: result.status !== 'error', requestId: result.requestId, status: skyStatus, error: result.error };
    }
    async checkStatus(requestId, provider) {
        switch (provider) {
            case 'bytez': {
                const result = await (0, bytezVideoService_1.getBytezVideoService)().checkStatus(requestId);
                if (result.status === 'success' && result.videoUrl) {
                    const localPath = await this.downloadVideo(result.videoUrl, 'bytez');
                    return { status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
                }
                const bytezStatus = result.status === 'failed' || result.status === 'error' ? 'error' : result.status;
                return { status: bytezStatus, error: result.error };
            }
            case 'fal': {
                const result = await (0, falVideoService_1.getFalVideoService)().checkStatus(requestId);
                if (result.status === 'success' && result.videoUrl) {
                    const localPath = await this.downloadVideo(result.videoUrl, 'fal');
                    return { status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
                }
                const falStatus = result.status === 'failed' || result.status === 'error' ? 'error' : result.status;
                return { status: falStatus, error: result.error };
            }
            case 'replicate': {
                const result = await (0, replicateVideoService_1.getReplicateVideoService)().checkStatus(requestId);
                if (result.status === 'success' && result.videoUrl) {
                    const localPath = await this.downloadVideo(result.videoUrl, 'replicate');
                    return { status: 'success', videoUrl: result.videoUrl, localPath: localPath || undefined };
                }
                const replStatus = result.status === 'failed' || result.status === 'error' ? 'error' : result.status;
                return { status: replStatus, error: result.error };
            }
            case 'heygen': {
                const result = await (0, heygenService_1.getHeyGenService)().checkStatus(requestId);
                const heygenStatus = result.data.status === 'completed' ? 'success' : result.data.status === 'failed' ? 'error' : 'processing';
                if (heygenStatus === 'success' && result.data.video_url) {
                    const localPath = await (0, heygenService_1.getHeyGenService)().downloadVideo(result.data.video_url, requestId);
                    return { status: heygenStatus, videoUrl: result.data.video_url, localPath: localPath || undefined };
                }
                return { status: heygenStatus, error: result.data.error };
            }
            case 'skyreels': {
                const result = await (0, skyreelsService_1.getSkyreelsService)().checkStatus(requestId);
                if (result.status === 'success') {
                    const resultData = await (0, skyreelsService_1.getSkyreelsService)().getResult(requestId);
                    if (resultData.videoList && resultData.videoList.length > 0) {
                        const videoUrl = resultData.videoList[0].url;
                        const localPath = await this.downloadVideo(videoUrl, 'skyreels');
                        return { status: 'success', videoUrl, localPath: localPath || undefined };
                    }
                }
                let skyStatus = 'processing';
                if (result.status === 'error' || result.status === 'failed') {
                    skyStatus = 'error';
                }
                else if (result.status === 'success') {
                    skyStatus = 'success';
                }
                return { status: skyStatus, error: result.error };
            }
            default:
                return { status: 'error', error: `Unknown provider: ${provider}` };
        }
    }
    async updateVideoWithResult(videoId, result) {
        await (0, db_1.query)(`UPDATE videos SET
        status = ?,
        video_url = ?,
        metadata = json_set(COALESCE(metadata, '{}'), '$.aiVideoRequestId', ?),
        updated_at = datetime('now')
       WHERE id = ?`, [
            result.status === 'success' ? 'completed' : result.status,
            result.localPath || result.videoUrl || null,
            result.requestId,
            videoId
        ]);
    }
    async downloadVideo(videoUrl, provider) {
        try {
            const filename = `video_${provider}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
            const filepath = path_1.default.join(this.rendersDir, filename);
            const response = await fetch(videoUrl);
            if (!response.ok) {
                console.error(`Failed to download video: ${response.status}`);
                return null;
            }
            const buffer = await response.arrayBuffer();
            await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, Buffer.from(buffer));
            console.log(`💾 Downloaded ${provider} video: ${filename}`);
            return filepath;
        }
        catch (error) {
            console.error(`Error downloading ${provider} video:`, error);
            return null;
        }
    }
    getAvailableProviders() {
        return [
            { id: 'bytez', name: 'Bytez', isAvailable: (0, bytezVideoService_1.getBytezVideoService)().isAvailable(), isTextToVideo: true, isAvatar: false },
            { id: 'fal', name: 'FAL AI', isAvailable: (0, falVideoService_1.getFalVideoService)().isAvailable(), isTextToVideo: true, isAvatar: false },
            { id: 'replicate', name: 'Replicate', isAvailable: (0, replicateVideoService_1.getReplicateVideoService)().isAvailable(), isTextToVideo: true, isAvatar: false },
            { id: 'heygen', name: 'HeyGen', isAvailable: (0, heygenService_1.getHeyGenService)().isAvailable(), isTextToVideo: false, isAvatar: true },
            { id: 'skyreels', name: 'SkyReels', isAvailable: (0, skyreelsService_1.getSkyreelsService)().isAvailable(), isTextToVideo: false, isAvatar: true }
        ];
    }
}
exports.UnifiedVideoService = UnifiedVideoService;
let unifiedService = null;
function getUnifiedVideoService() {
    if (!unifiedService) {
        unifiedService = new UnifiedVideoService();
    }
    return unifiedService;
}
exports.default = UnifiedVideoService;
//# sourceMappingURL=unifiedVideoService.js.map
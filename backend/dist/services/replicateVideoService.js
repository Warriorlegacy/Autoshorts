"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicateVideoService = exports.REPLICATE_VIDEO_MODELS = void 0;
exports.getReplicateVideoService = getReplicateVideoService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const config_1 = require("../constants/config");
exports.REPLICATE_VIDEO_MODELS = {
    DEFAULT: 'minimax/controlnet-next',
    COGVIDEO: 'THUDM/CogVideo',
    COGVIDEO_9B: 'THUDM/CogVideo:9c3ed42c1c8252e2355895a9c2f6078bfcf4f7963e42a3b5c5a28e7a3e7c7c7c',
    DEFORUM: 'deforum/deforum',
};
class ReplicateVideoService {
    constructor() {
        this.apiKey = config_1.API_KEYS.REPLICATE || '';
        this.baseUrl = config_1.SERVICE_URLS.REPLICATE_API;
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_replicate_api_key_here';
    }
    async generateVideo(options) {
        if (!this.isAvailable()) {
            return {
                requestId: '',
                status: 'error',
                error: 'Replicate API key not configured'
            };
        }
        try {
            console.log(`🎬 Generating video with Replicate (CogVideo): "${options.prompt.substring(0, 50)}..."`);
            const model = options.model || exports.REPLICATE_VIDEO_MODELS.COGVIDEO;
            const versionId = exports.REPLICATE_VIDEO_MODELS.COGVIDEO_9B;
            const requestBody = {
                prompt: options.prompt,
                num_frames: options.numFrames || 32,
                fps: options.fps || 8,
                width: options.width || 480,
                height: options.height || 272,
            };
            const response = await fetch(`${this.baseUrl}/models/${model}/versions/${versionId}/predictions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'wait',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`Replicate video API error: ${response.status} - ${error}`);
                return {
                    requestId: '',
                    status: 'error',
                    error: `API error: ${response.status}`
                };
            }
            const data = await response.json();
            if (data.status === 'succeeded' && data.output?.video) {
                return {
                    requestId: data.id,
                    status: 'success',
                    videoUrl: data.output.video
                };
            }
            if (data.status === 'processing' || data.status === 'starting') {
                return {
                    requestId: data.id,
                    status: 'processing',
                };
            }
            if (data.status === 'failed') {
                return {
                    requestId: data.id,
                    status: 'error',
                    error: data.error || 'Video generation failed'
                };
            }
            console.log('Replicate response:', JSON.stringify(data).substring(0, 500));
            return {
                requestId: data.id || `replicate_${Date.now()}`,
                status: 'processing',
            };
        }
        catch (error) {
            console.error('Replicate video generation error:', error);
            return {
                requestId: '',
                status: 'error',
                error: error.message
            };
        }
    }
    async checkStatus(requestId) {
        if (!this.isAvailable()) {
            return {
                requestId,
                status: 'error',
                error: 'Replicate API key not configured'
            };
        }
        try {
            const model = exports.REPLICATE_VIDEO_MODELS.COGVIDEO;
            const versionId = exports.REPLICATE_VIDEO_MODELS.COGVIDEO_9B;
            const response = await fetch(`${this.baseUrl}/models/${model}/versions/${versionId}/predictions/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                return {
                    requestId,
                    status: 'error',
                    error: `Status check failed: ${response.status}`
                };
            }
            const data = await response.json();
            let status = 'processing';
            if (data.status === 'succeeded')
                status = 'success';
            else if (data.status === 'failed')
                status = 'error';
            return {
                requestId: data.id,
                status,
                videoUrl: data.output?.video,
                error: data.status === 'failed' ? data.error : undefined
            };
        }
        catch (error) {
            return {
                requestId,
                status: 'error',
                error: error.message
            };
        }
    }
    async cancelPrediction(requestId) {
        if (!this.isAvailable()) {
            return false;
        }
        try {
            const model = exports.REPLICATE_VIDEO_MODELS.COGVIDEO;
            const versionId = exports.REPLICATE_VIDEO_MODELS.COGVIDEO_9B;
            const response = await fetch(`${this.baseUrl}/models/${model}/versions/${versionId}/predictions/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            return response.ok || response.status === 204;
        }
        catch (error) {
            console.error('Error cancelling Replicate prediction:', error);
            return false;
        }
    }
    async downloadVideo(videoUrl) {
        try {
            const filename = `video_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
            const filepath = path_1.default.join(this.rendersDir, filename);
            const response = await fetch(videoUrl);
            if (!response.ok) {
                console.error(`Failed to download video: ${response.status}`);
                return null;
            }
            const buffer = await response.arrayBuffer();
            await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, Buffer.from(buffer));
            console.log(`💾 Downloaded Replicate video: ${filename}`);
            return filepath;
        }
        catch (error) {
            console.error('Error downloading Replicate video:', error);
            return null;
        }
    }
}
exports.ReplicateVideoService = ReplicateVideoService;
let replicateVideoService = null;
function getReplicateVideoService() {
    if (!replicateVideoService) {
        replicateVideoService = new ReplicateVideoService();
    }
    return replicateVideoService;
}
exports.default = ReplicateVideoService;
//# sourceMappingURL=replicateVideoService.js.map
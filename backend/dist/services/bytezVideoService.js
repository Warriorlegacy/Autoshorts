"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytezVideoService = exports.BYTEZ_VIDEO_MODELS = void 0;
exports.getBytezVideoService = getBytezVideoService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const config_1 = require("../constants/config");
exports.BYTEZ_VIDEO_MODELS = {
    DEFAULT: 'ali-vilab/text-to-video-ms-1.7b',
    ZEROSCOPE: 'cerspense/zeroscope_v2_576w',
    WAN: 'wan/v2.6/text-to-video',
};
class BytezVideoService {
    constructor() {
        this.apiKey = config_1.API_KEYS.BYTEZ || '';
        this.baseUrl = config_1.SERVICE_URLS.BYTEZ_API;
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_bytez_api_key_here';
    }
    async generateVideo(options) {
        if (!this.isAvailable()) {
            return {
                requestId: '',
                status: 'error',
                error: 'Bytez API key not configured'
            };
        }
        try {
            console.log(`🎬 Generating video with Bytez: "${options.prompt.substring(0, 50)}..."`);
            const model = options.model || exports.BYTEZ_VIDEO_MODELS.DEFAULT;
            const isZeroScope = model.includes('zeroscope');
            const requestBody = isZeroScope
                ? {
                    text: options.prompt,
                    num_frames: 24,
                    fps: 8,
                }
                : {
                    text: options.prompt,
                    width: options.width || 576,
                    height: options.height || 320,
                };
            const response = await fetch(`${this.baseUrl}/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`Bytez video API error: ${response.status} - ${error}`);
                return {
                    requestId: '',
                    status: 'error',
                    error: `API error: ${response.status}`
                };
            }
            const data = await response.json();
            const requestId = data.id || `bytez_${Date.now()}`;
            // Handle direct URL in output (Bytez returns URL directly)
            if (typeof data.output === 'string' && data.output.startsWith('http')) {
                return {
                    requestId,
                    status: 'success',
                    videoUrl: data.output
                };
            }
            // Handle object format with video_url
            if (typeof data.output === 'object' && data.output !== null && 'video_url' in data.output && data.output.video_url) {
                return {
                    requestId,
                    status: 'success',
                    videoUrl: data.output.video_url
                };
            }
            // Handle object format with video
            if (typeof data.output === 'object' && data.output !== null && 'video' in data.output && data.output.video) {
                return {
                    requestId,
                    status: 'success',
                    videoUrl: data.output.video
                };
            }
            console.log('Bytez response:', JSON.stringify(data).substring(0, 500));
            return {
                requestId,
                status: 'processing',
            };
        }
        catch (error) {
            console.error('Bytez video generation error:', error);
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
                error: 'Bytez API key not configured'
            };
        }
        try {
            const response = await fetch(`${this.baseUrl}/requests/${requestId}`, {
                headers: {
                    'Authorization': this.apiKey,
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
            return {
                requestId,
                status: data.status === 'succeeded' ? 'success' :
                    data.status === 'failed' ? 'error' : 'processing',
                videoUrl: data.output?.video_url || data.output?.video
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
            console.log(`💾 Downloaded Bytez video: ${filename}`);
            return filepath;
        }
        catch (error) {
            console.error('Error downloading Bytez video:', error);
            return null;
        }
    }
}
exports.BytezVideoService = BytezVideoService;
let bytezVideoService = null;
function getBytezVideoService() {
    if (!bytezVideoService) {
        bytezVideoService = new BytezVideoService();
    }
    return bytezVideoService;
}
exports.default = BytezVideoService;
//# sourceMappingURL=bytezVideoService.js.map
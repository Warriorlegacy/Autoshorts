"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FalVideoService = exports.FAL_VIDEO_MODELS = void 0;
exports.getFalVideoService = getFalVideoService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const config_1 = require("../constants/config");
exports.FAL_VIDEO_MODELS = {
    DEFAULT: 'fal-ai/ltx-video',
    LTX_VIDEO: 'fal-ai/ltx-video',
    MOCHI: 'fal-ai/mochi-v1',
};
class FalVideoService {
    constructor() {
        this.apiKey = config_1.API_KEYS.FAL || '';
        this.baseUrl = config_1.SERVICE_URLS.FAL_API;
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_fal_api_key_here';
    }
    async generateVideo(options) {
        if (!this.isAvailable()) {
            return {
                requestId: '',
                status: 'error',
                error: 'FAL API key not configured'
            };
        }
        try {
            const model = options.model || exports.FAL_VIDEO_MODELS.DEFAULT;
            const isMochi = model === exports.FAL_VIDEO_MODELS.MOCHI;
            console.log(`🎬 Generating video with FAL (${isMochi ? 'Mochi' : 'LTX Video'}): "${options.prompt.substring(0, 50)}..."`);
            let requestBody;
            let response;
            if (isMochi) {
                // Mochi has a simpler API
                requestBody = {
                    prompt: options.prompt,
                };
                response = await fetch(`${this.baseUrl}/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
            }
            else {
                // LTX Video has more parameters
                requestBody = {
                    prompt: options.prompt,
                    negative_prompt: options.negativePrompt || 'worst quality, low quality, blurry, distorted, bad anatomy, bad proportions',
                    num_frames: options.duration ? Math.min(options.duration * 24, 97) : 49,
                    fps: options.fps || 24,
                    width: options.width || 768,
                    height: options.height || 512,
                    seed: options.seed || Math.floor(Math.random() * 2147483647),
                    guidance_scale: 3.5,
                    motion_bucket_id: 127,
                };
                response = await fetch(`${this.baseUrl}/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });
            }
            if (!response.ok) {
                const error = await response.text();
                console.error(`FAL video API error: ${response.status} - ${error}`);
                return {
                    requestId: '',
                    status: 'error',
                    error: `API error: ${response.status}`
                };
            }
            const data = await response.json();
            if (data.request_id) {
                if (data.output?.video) {
                    return {
                        requestId: data.request_id,
                        status: 'success',
                        videoUrl: data.output.video
                    };
                }
                return {
                    requestId: data.request_id,
                    status: 'processing',
                };
            }
            if (data.output?.video) {
                return {
                    requestId: `fal_${Date.now()}`,
                    status: 'success',
                    videoUrl: data.output.video
                };
            }
            console.log('FAL response:', JSON.stringify(data).substring(0, 500));
            return {
                requestId: `fal_${Date.now()}`,
                status: 'processing',
            };
        }
        catch (error) {
            console.error('FAL video generation error:', error);
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
                error: 'FAL API key not configured'
            };
        }
        try {
            const response = await fetch(`${this.baseUrl}/requests/${requestId}`, {
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
            if (data.status === 'completed')
                status = 'success';
            else if (data.status === 'failed')
                status = 'error';
            return {
                requestId: data.request_id,
                status,
                videoUrl: data.output?.video,
                progress: data.progress,
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
            console.log(`💾 Downloaded FAL video: ${filename}`);
            return filepath;
        }
        catch (error) {
            console.error('Error downloading FAL video:', error);
            return null;
        }
    }
}
exports.FalVideoService = FalVideoService;
let falVideoService = null;
function getFalVideoService() {
    if (!falVideoService) {
        falVideoService = new FalVideoService();
    }
    return falVideoService;
}
exports.default = FalVideoService;
//# sourceMappingURL=falVideoService.js.map
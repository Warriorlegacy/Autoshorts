"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunwayMLService = exports.RUNWAYML_MODELS = void 0;
exports.getRunwayMLService = getRunwayMLService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const config_1 = require("../constants/config");
exports.RUNWAYML_MODELS = {
    GEN3_ALPHA: 'gen3_alpha',
    GEN3_ALPHA_TURBO: 'gen3_alpha_turbo',
};
class RunwayMLService {
    constructor() {
        this.apiKey = config_1.API_KEYS.RUNWAYML || '';
        this.baseUrl = 'https://api.runwayml.com/v1';
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_runwayml_api_key_here';
    }
    async generateVideo(options) {
        if (!this.isAvailable()) {
            return {
                requestId: '',
                status: 'error',
                error: 'RunwayML API key not configured'
            };
        }
        try {
            console.log(`🎬 Generating video with RunwayML: "${options.prompt.substring(0, 50)}..."`);
            const model = options.model || exports.RUNWAYML_MODELS.GEN3_ALPHA;
            const requestBody = {
                prompt: options.prompt,
                negative_prompt: options.negativePrompt || 'low quality, blurry, distorted',
                model: model,
                duration: options.duration || 10,
                aspect_ratio: '9:16',
            };
            const response = await fetch(`${this.baseUrl}/generations/text-to-video`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`RunwayML API error: ${response.status} - ${error}`);
                return {
                    requestId: '',
                    status: 'error',
                    error: `API error: ${response.status}`
                };
            }
            const data = await response.json();
            if (data.id) {
                return {
                    requestId: data.id,
                    status: 'processing',
                };
            }
            if (data.output?.video) {
                return {
                    requestId: data.id || `runway_${Date.now()}`,
                    status: 'success',
                    videoUrl: data.output.video
                };
            }
            return {
                requestId: `runway_${Date.now()}`,
                status: 'processing',
            };
        }
        catch (error) {
            console.error('RunwayML video generation error:', error);
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
                error: 'RunwayML API key not configured'
            };
        }
        try {
            const response = await fetch(`${this.baseUrl}/generations/${requestId}`, {
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
                requestId: data.id,
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
            const filename = `video_runway_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
            const filepath = path_1.default.join(this.rendersDir, filename);
            const response = await fetch(videoUrl);
            if (!response.ok) {
                console.error(`Failed to download video: ${response.status}`);
                return null;
            }
            const buffer = await response.arrayBuffer();
            await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, Buffer.from(buffer));
            console.log(`💾 Downloaded RunwayML video: ${filename}`);
            return filepath;
        }
        catch (error) {
            console.error('Error downloading RunwayML video:', error);
            return null;
        }
    }
}
exports.RunwayMLService = RunwayMLService;
let runwayMLService = null;
function getRunwayMLService() {
    if (!runwayMLService) {
        runwayMLService = new RunwayMLService();
    }
    return runwayMLService;
}
exports.default = RunwayMLService;
//# sourceMappingURL=runwayMLService.js.map
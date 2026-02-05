"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeyGenService = void 0;
exports.getHeyGenService = getHeyGenService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../constants/config");
class HeyGenService {
    constructor() {
        this.apiKey = config_1.API_KEYS.HEYGEN || '';
        this.baseUrl = config_1.SERVICE_URLS.HEYGEN_API || 'https://api.heygen.com';
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_heygen_api_key_here';
    }
    /**
     * Get list of available avatars
     */
    async getAvatars() {
        if (!this.isAvailable()) {
            console.log('HeyGen API key not configured');
            return [];
        }
        try {
            const response = await fetch(`${this.baseUrl}/v2/avatars`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                console.error('Failed to fetch HeyGen avatars:', response.status);
                return [];
            }
            const data = await response.json();
            return data.avatars || [];
        }
        catch (error) {
            console.error('Error fetching HeyGen avatars:', error.message);
            return [];
        }
    }
    /**
     * Generate avatar video with lip-sync
     */
    async generateVideo(options) {
        if (!this.isAvailable()) {
            return {
                videoId: '',
                status: 'error',
                error: 'HeyGen API key not configured'
            };
        }
        try {
            const payload = {
                video_inputs: [
                    {
                        type: 'avatar',
                        avatar_id: options.avatarId || 'default-avatar',
                        avatar_style: 'normal',
                        voice: {
                            type: 'audio',
                            audio_url: options.audioUrl,
                        },
                    },
                ],
            };
            // Set to standard quality for free tier
            payload.quality = 'standard';
            payload.dimension = {
                width: 1280,
                height: 720,
            };
            // Add custom first frame if provided
            if (options.avatarImage) {
                payload.video_inputs[0].background = {
                    type: 'image',
                    image_url: options.avatarImage,
                };
            }
            // Add script if no audio URL
            if (!options.audioUrl && options.text) {
                payload.video_inputs[0].voice = {
                    type: 'text',
                    input_text: options.text,
                    voice_id: 'cef3bc4e0a84424cafcde6f2cf466c97', // Ivy voice
                };
            }
            console.log('🎬 Submitting HeyGen avatar video request...');
            const response = await fetch(`${this.baseUrl}/v2/video/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (data.error) {
                console.error('HeyGen API error:', data.error.message);
                return {
                    videoId: '',
                    status: 'error',
                    error: data.error.message
                };
            }
            const videoId = data.data?.video_id;
            if (!videoId) {
                console.error('No video ID in HeyGen response:', JSON.stringify(data));
                return {
                    videoId: '',
                    status: 'error',
                    error: 'Failed to get video ID from HeyGen'
                };
            }
            console.log(`✅ HeyGen video generated. Video ID: ${videoId}`);
            return {
                videoId,
                status: 'processing'
            };
        }
        catch (error) {
            console.error('HeyGen API error:', error.message);
            return {
                videoId: '',
                status: 'error',
                error: error.message
            };
        }
    }
    /**
     * Check status of video generation
     */
    async checkStatus(videoId) {
        if (!this.isAvailable()) {
            throw new Error('HeyGen API key not configured');
        }
        const response = await fetch(`${this.baseUrl.replace('/v2', '/v1')}/video_status.get?video_id=${videoId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`HeyGen API error: ${response.status}`);
        }
        return await response.json();
    }
    /**
     * Wait for video generation to complete
     */
    async waitForCompletion(videoId, timeoutMs = 600000, pollIntervalMs = 10000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const statusResult = await this.checkStatus(videoId);
            const status = statusResult.data.status;
            console.log(`📊 HeyGen video status: ${status}`);
            if (status === 'completed') {
                return statusResult.data.video_url || null;
            }
            if (status === 'failed') {
                console.error('HeyGen video generation failed:', statusResult.data.error);
                return null;
            }
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }
        console.error('⏰ HeyGen video generation timed out');
        return null;
    }
    /**
     * Download video from HeyGen to local file
     */
    async downloadVideo(videoUrl, requestId) {
        return new Promise((resolve) => {
            const filename = `avatar_${requestId}_${Date.now()}.mp4`;
            const filepath = path_1.default.join(this.rendersDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            https_1.default.get(videoUrl, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Avatar video saved: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download video: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error(`Download error: ${err.message}`);
                resolve(null);
            });
        });
    }
}
exports.HeyGenService = HeyGenService;
// Singleton instance
let heygenService = null;
function getHeyGenService() {
    if (!heygenService) {
        heygenService = new HeyGenService();
    }
    return heygenService;
}
const https_1 = __importDefault(require("https"));
//# sourceMappingURL=heygenService.js.map
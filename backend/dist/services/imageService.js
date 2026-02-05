"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageGenerationService = void 0;
exports.getImageGenerationService = getImageGenerationService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const util_1 = require("util");
const config_1 = require("../constants/config");
/**
 * Pollinations AI Provider - Uses gen.pollinations.ai API
 * With API key: Higher rate limits and no restrictions
 */
class PollinationsProvider {
    constructor(imagesDir) {
        this.name = 'pollinations';
        this.baseUrl = 'https://gen.pollinations.ai';
        this.imagesDir = imagesDir;
        this.apiKey = process.env.POLLINATION_API_KEY;
    }
    isAvailable() {
        return true;
    }
    async generateImage(prompt, options) {
        try {
            const dimensions = this.getDimensionsForAspectRatio(options.aspectRatio || '9:16');
            const model = options.model || 'flux';
            const encodedPrompt = encodeURIComponent(prompt);
            const params = new URLSearchParams({
                width: dimensions.width.toString(),
                height: dimensions.height.toString(),
                nologo: 'true',
                seed: Date.now().toString(),
                model: model,
            });
            const url = `${this.baseUrl}/image/${encodedPrompt}?${params.toString()}`;
            console.log(`🌐 Pollinations API URL: ${url.substring(0, 100)}...`);
            const headers = {};
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
                console.log('🔑 Using Pollination API key for higher rate limits');
            }
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const localPath = await this.downloadImage(url, filename, headers);
            if (!localPath) {
                return null;
            }
            const backendPort = process.env.PORT || '3001';
            const imageUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            return {
                imageUrl,
                localPath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Pollinations API error:', error);
            return null;
        }
    }
    getDimensionsForAspectRatio(aspectRatio) {
        const dimensions = {
            '9:16': { width: 1080, height: 1920 },
            '16:9': { width: 1920, height: 1080 },
            '1:1': { width: 1080, height: 1080 },
        };
        return dimensions[aspectRatio] || dimensions['9:16'];
    }
    async downloadImage(url, filename, headers = {}) {
        return new Promise((resolve) => {
            const filepath = path_1.default.join(this.imagesDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            const urlObj = new URL(url);
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: headers,
            };
            https_1.default.get(options, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Downloaded image: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download image: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error('Error downloading image:', err.message);
                resolve(null);
            });
        });
    }
}
/**
 * Hugging Face Inference API Provider - Free tier: 1,000 req/month
 */
class HuggingFaceProvider {
    constructor(imagesDir) {
        this.name = 'huggingface';
        this.imagesDir = imagesDir;
        this.apiKey = config_1.API_KEYS.HUGGINGFACE;
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_huggingface_api_key_here';
    }
    async generateImage(prompt, options) {
        if (!this.isAvailable()) {
            console.log('Hugging Face API key not configured');
            return null;
        }
        const model = options.model || 'stabilityai/stable-diffusion-2-1';
        const fallbackModel = 'segmind/SSD-1B'; // Faster alternative, no gated access required
        try {
            const result = await this.tryHuggingFaceModel(prompt, model, options);
            // If primary model fails with 410 (access required), try fallback
            if (result === null && model !== fallbackModel) {
                console.log(`🔄 Primary model requires access approval. Trying fallback: ${fallbackModel}`);
                return await this.tryHuggingFaceModel(prompt, fallbackModel, options);
            }
            return result;
        }
        catch (error) {
            console.error('Hugging Face error:', error);
            return null;
        }
    }
    async tryHuggingFaceModel(prompt, model, options) {
        try {
            const apiUrl = `${config_1.SERVICE_URLS.HUGGINGFACE_API}/${model}`;
            console.log(`🤗 Generating image with Hugging Face: ${model}`);
            // Call Hugging Face Inference API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: prompt }),
            });
            if (!response.ok) {
                if (response.status === 410) {
                    console.warn(`⚠️ Model ${model} requires access approval (410). Will try fallback if available.`);
                    return null; // Signal to try fallback
                }
                console.error(`Hugging Face API error: ${response.status}`);
                return null;
            }
            // Get image buffer
            const imageBuffer = await response.arrayBuffer();
            // Save to file
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const filepath = path_1.default.join(this.imagesDir, filename);
            await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, Buffer.from(imageBuffer));
            const backendPort = process.env.PORT || '3001';
            const imageUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ Hugging Face image generated with ${model}: ${filename}`);
            return {
                imageUrl,
                localPath: filepath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Hugging Face error:', error);
            return null;
        }
    }
}
/**
 * Craiyon Provider - Completely FREE, no API key needed
 * Generates 9 images per request, we'll use one
 */
class CraiyonProvider {
    constructor(imagesDir) {
        this.name = 'craiyon';
        this.lastRequestTime = 0;
        this.MIN_REQUEST_INTERVAL = 10000; // 10 seconds between requests
        this.imagesDir = imagesDir;
    }
    isAvailable() {
        // Rate limit check
        const now = Date.now();
        if (now - this.lastRequestTime < this.MIN_REQUEST_INTERVAL) {
            return false;
        }
        return true;
    }
    async generateImage(prompt, options) {
        try {
            this.lastRequestTime = Date.now();
            const model = options.model || 'gallery';
            console.log(`🎨 Generating image with Craiyon (free), model: ${model}...`);
            const response = await fetch('https://api.craiyon.com/v3', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: model === 'optimized' ? 'optimized' : 'gallery',
                    width: 512,
                    height: 512,
                }),
            });
            if (!response.ok) {
                console.error(`Craiyon API error: ${response.status}`);
                return null;
            }
            const data = await response.json();
            if (!data.images || data.images.length === 0) {
                console.error('No images in Craiyon response');
                return null;
            }
            const base64Image = data.images[0];
            const base64Data = base64Image.startsWith('data:image')
                ? base64Image
                : `data:image/png;base64,${base64Image}`;
            // Remove the data URI prefix
            const base64Content = base64Data.split(',')[1];
            // Save the image
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const filepath = path_1.default.join(this.imagesDir, filename);
            await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, Buffer.from(base64Content, 'base64'));
            const backendPort = process.env.PORT || '3001';
            const imageUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ Craiyon image generated: ${filename}`);
            return {
                imageUrl,
                localPath: filepath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Craiyon error:', error);
            return null;
        }
    }
}
/**
 * Leonardo AI Provider - Free tier: 150 credits/day
 * Requires API key but has generous free tier
 */
class LeonardoProvider {
    constructor(imagesDir) {
        this.name = 'leonardo';
        this.imagesDir = imagesDir;
        this.apiKey = process.env.LEONARDO_API_KEY;
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_leonardo_api_key_here';
    }
    async generateImage(prompt, options) {
        if (!this.isAvailable()) {
            console.log('Leonardo API key not configured');
            return null;
        }
        try {
            console.log(`🎨 Generating image with Leonardo AI...`);
            const dimensions = this.getDimensionsForAspectRatio(options.aspectRatio || '9:16');
            const modelId = options.model || '6bef9f1b-29cb-40c7-b9de-3e6a41e5c68f';
            // Init generation
            const initResponse = await fetch('https://api.leonardo.ai/v1/generations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    width: dimensions.width,
                    height: dimensions.height,
                    num_images: 1,
                    model_id: modelId,
                }),
            });
            if (!initResponse.ok) {
                const error = await initResponse.text();
                console.error(`Leonardo API error: ${error}`);
                return null;
            }
            const initData = await initResponse.json();
            const generationId = initData.generation_id;
            // Poll for result
            const imageUrl = await this.pollForResult(generationId);
            if (!imageUrl) {
                return null;
            }
            // Download the image
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const localPath = await this.downloadImage(imageUrl, filename);
            if (!localPath) {
                return null;
            }
            const backendPort = process.env.PORT || '3001';
            const imageUrlLocal = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ Leonardo image generated: ${filename}`);
            return {
                imageUrl: imageUrlLocal,
                localPath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Leonardo error:', error);
            return null;
        }
    }
    async pollForResult(generationId) {
        const maxAttempts = 90; // 3 minutes
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                const response = await fetch(`https://api.leonardo.ai/v1/generations/${generationId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                });
                if (!response.ok)
                    continue;
                const data = await response.json();
                if (data.generations && data.generations.length > 0) {
                    const image = data.generations[0];
                    if (image.status === 'COMPLETE' && image.url) {
                        return image.url;
                    }
                    else if (image.status === 'FAILED') {
                        console.error('Leonardo generation failed');
                        return null;
                    }
                }
            }
            catch (error) {
                console.error('Leonardo poll error:', error);
            }
        }
        console.error('Leonardo generation timed out');
        return null;
    }
    getDimensionsForAspectRatio(aspectRatio) {
        const dimensions = {
            '9:16': { width: 576, height: 1024 },
            '16:9': { width: 1024, height: 576 },
            '1:1': { width: 1024, height: 1024 },
        };
        return dimensions[aspectRatio] || dimensions['9:16'];
    }
    async downloadImage(url, filename) {
        return new Promise((resolve) => {
            const filepath = path_1.default.join(this.imagesDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            const protocol = url.startsWith('https') ? https_1.default : http_1.default;
            protocol.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Downloaded image: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download image: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error('Error downloading image:', err.message);
                resolve(null);
            });
        });
    }
}
/**
 * DeepAI Provider - Free tier available
 */
class DeepAIProvider {
    constructor(imagesDir) {
        this.name = 'deepai';
        this.imagesDir = imagesDir;
        this.apiKey = process.env.DEEPAI_API_KEY;
    }
    isAvailable() {
        return true; // Works without API key for limited use
    }
    async generateImage(prompt, options) {
        try {
            console.log(`🎨 Generating image with DeepAI (free)...`);
            const response = await fetch('https://api.deepai.org/api/stable-diffusion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `text=${encodeURIComponent(prompt)}`,
            });
            if (!response.ok) {
                console.error(`DeepAI API error: ${response.status}`);
                return null;
            }
            const data = await response.json();
            if (!data.output_url) {
                console.error('No output URL in DeepAI response');
                return null;
            }
            // Download the image
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const localPath = await this.downloadImage(data.output_url, filename);
            if (!localPath) {
                return null;
            }
            const backendPort = process.env.PORT || '3001';
            const imageUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ DeepAI image generated: ${filename}`);
            return {
                imageUrl,
                localPath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('DeepAI error:', error);
            return null;
        }
    }
    async downloadImage(url, filename) {
        return new Promise((resolve) => {
            const filepath = path_1.default.join(this.imagesDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            const protocol = url.startsWith('https') ? https_1.default : http_1.default;
            protocol.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Downloaded image: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download image: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error('Error downloading image:', err.message);
                resolve(null);
            });
        });
    }
}
/**
 * Replicate Provider (Flux) - Free tier available
 */
class ReplicateProvider {
    constructor(imagesDir) {
        this.name = 'replicate';
        this.imagesDir = imagesDir;
        this.apiKey = config_1.API_KEYS.REPLICATE;
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_replicate_api_key_here';
    }
    async generateImage(prompt, options) {
        if (!this.isAvailable()) {
            console.log('Replicate API key not configured');
            return null;
        }
        try {
            const model = options.model || config_1.FREE_SERVICES.FLUX.MODEL;
            const dimensions = this.getDimensionsForAspectRatio(options.aspectRatio || '9:16');
            console.log(`🚀 Generating image with Replicate: ${model}`);
            // Create prediction
            const response = await fetch(`${config_1.SERVICE_URLS.REPLICATE_API}/predictions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    version: model,
                    input: {
                        prompt: prompt,
                        width: dimensions.width,
                        height: dimensions.height,
                        num_outputs: 1,
                    },
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`Replicate API error: ${response.status} - ${error}`);
                return null;
            }
            const prediction = await response.json();
            // Poll for completion
            const imageUrl = await this.pollForResult(prediction.id);
            if (!imageUrl) {
                return null;
            }
            // Download the image
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const localPath = await this.downloadImage(imageUrl, filename);
            if (!localPath) {
                return null;
            }
            const backendPort = process.env.PORT || '3001';
            const imageUrlLocal = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ Replicate image generated: ${filename}`);
            return {
                imageUrl: imageUrlLocal,
                localPath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Replicate error:', error);
            return null;
        }
    }
    async pollForResult(predictionId) {
        const maxAttempts = 60; // 2 minutes (2 seconds per poll)
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                const response = await fetch(`${config_1.SERVICE_URLS.REPLICATE_API}/predictions/${predictionId}`, {
                    headers: {
                        'Authorization': `Token ${this.apiKey}`,
                    },
                });
                if (!response.ok)
                    continue;
                const result = await response.json();
                if (result.status === 'succeeded') {
                    return result.output?.[0] || null;
                }
                else if (result.status === 'failed') {
                    console.error('Replicate prediction failed:', result.error);
                    return null;
                }
            }
            catch (error) {
                console.error('Poll error:', error);
            }
        }
        console.error('Replicate prediction timed out');
        return null;
    }
    getDimensionsForAspectRatio(aspectRatio) {
        const dimensions = {
            '9:16': { width: 1080, height: 1920 },
            '16:9': { width: 1920, height: 1080 },
            '1:1': { width: 1080, height: 1080 },
        };
        return dimensions[aspectRatio] || dimensions['9:16'];
    }
    async downloadImage(url, filename) {
        return new Promise((resolve) => {
            const filepath = path_1.default.join(this.imagesDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            https_1.default.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Downloaded image: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download image: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error('Error downloading image:', err.message);
                resolve(null);
            });
        });
    }
}
/**
 * Free AI Text Generation Provider using available script providers
 * For prompt enhancement and stock suggestions
 */
class FreeTextProvider {
    async makeGroqRequest(prompt) {
        const apiKey = config_1.API_KEYS.GROQ;
        if (!apiKey || apiKey === 'your_groq_api_key_here')
            return null;
        try {
            const response = await fetch(`${config_1.SERVICE_URLS.GROQ_API}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant. Always respond concisely.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                }),
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            return data.choices[0]?.message?.content || null;
        }
        catch (error) {
            console.error('Groq text generation error:', error);
            return null;
        }
    }
    async makeOpenRouterRequest(prompt) {
        const apiKey = config_1.API_KEYS.OPENROUTER;
        if (!apiKey || apiKey === 'your_openrouter_api_key_here')
            return null;
        try {
            const response = await fetch(`${config_1.SERVICE_URLS.OPENROUTER_API}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:3001',
                    'X-Title': 'AutoShorts',
                },
                body: JSON.stringify({
                    model: 'meta-llama/llama-3.1-8b-instruct:free',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                }),
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            return data.choices[0]?.message?.content || null;
        }
        catch (error) {
            console.error('OpenRouter text generation error:', error);
            return null;
        }
    }
    async makeTogetherRequest(prompt) {
        const apiKey = config_1.API_KEYS.TOGETHER;
        if (!apiKey || apiKey === 'your_together_api_key_here')
            return null;
        try {
            const response = await fetch(`${config_1.SERVICE_URLS.TOGETHER_API}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024,
                }),
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            return data.choices[0]?.message?.content || null;
        }
        catch (error) {
            console.error('Together AI text generation error:', error);
            return null;
        }
    }
    async generateText(prompt) {
        // Try providers in order: Groq -> OpenRouter -> Together
        const providers = [
            { name: 'Groq', fn: () => this.makeGroqRequest(prompt) },
            { name: 'OpenRouter', fn: () => this.makeOpenRouterRequest(prompt) },
            { name: 'Together AI', fn: () => this.makeTogetherRequest(prompt) },
        ];
        for (const provider of providers) {
            try {
                const result = await provider.fn();
                if (result) {
                    console.log(`✅ Text generated with ${provider.name}`);
                    return result;
                }
            }
            catch (error) {
                console.warn(`${provider.name} text generation failed`);
            }
        }
        console.warn('⚠️ All text providers failed, using fallback');
        return null;
    }
}
/**
 * Image Generation Service with Multiple Providers
 */
class ImageGenerationService {
    constructor() {
        // Ensure images directory exists
        this.imagesDir = path_1.default.join(process.cwd(), 'public', 'images');
        if (!fs_1.default.existsSync(this.imagesDir)) {
            fs_1.default.mkdirSync(this.imagesDir, { recursive: true });
        }
        // Initialize providers - Order matters for fallback priority
        this.providers = new Map();
        this.providers.set('pexels', new PexelsProvider(this.imagesDir)); // Stock photos (200/month free)
        this.providers.set('bytez', new BytezProvider(this.imagesDir)); // 220k+ models
        this.providers.set('craiyon', new CraiyonProvider(this.imagesDir)); // Completely free
        this.providers.set('deepai', new DeepAIProvider(this.imagesDir)); // Free tier
        this.providers.set('pollinations', new PollinationsProvider(this.imagesDir)); // Free but rate limited
        this.providers.set('leonardo', new LeonardoProvider(this.imagesDir)); // Free tier with API key
        this.providers.set('huggingface', new HuggingFaceProvider(this.imagesDir)); // Free tier with API key
        this.providers.set('replicate', new ReplicateProvider(this.imagesDir)); // Free tier with API key
        // Set default provider from config
        this.defaultProvider = config_1.IMAGE_PROVIDERS.DEFAULT;
        // Initialize free text provider for enhancements
        this.textProvider = new FreeTextProvider();
        // Schedule cleanup
        this.scheduleCleanup();
        // Log available providers
        console.log('🎨 Image Generation Providers:');
        this.providers.forEach((provider, name) => {
            const available = provider.isAvailable() ? '✅' : '❌';
            console.log(`   ${available} ${name}`);
        });
    }
    /**
     * Get available providers
     */
    getAvailableProviders() {
        return Array.from(this.providers.entries()).map(([name, provider]) => ({
            name,
            available: provider.isAvailable(),
        }));
    }
    /**
     * Schedule periodic cleanup of old images
     */
    scheduleCleanup() {
        setInterval(() => {
            this.cleanupOldImages(7).catch((error) => {
                console.error('Scheduled cleanup failed:', error);
            });
        }, 24 * 60 * 60 * 1000);
    }
    /**
     * Generate an image using specified or default provider
     */
    async generateImage(options) {
        const providerName = options.provider || this.defaultProvider;
        console.log(`🎨 Generating image with provider: ${providerName}, model: ${options.model || 'default'}`);
        // Enhance prompt if possible using free providers
        let enhancedPrompt = options.prompt;
        try {
            const enhanced = await this.enhancePrompt(options);
            if (enhanced) {
                enhancedPrompt = enhanced;
            }
        }
        catch (e) {
            console.warn('Failed to enhance prompt, using original:', e);
        }
        // Try the requested provider
        const provider = this.providers.get(providerName);
        if (provider && provider.isAvailable()) {
            const result = await provider.generateImage(enhancedPrompt, options);
            if (result) {
                return result;
            }
            console.log(`⚠️ Provider ${providerName} failed, trying fallback...`);
        }
        // Try all available providers as fallback
        for (const [name, fallbackProvider] of this.providers) {
            if (name !== providerName && fallbackProvider.isAvailable()) {
                console.log(`🔄 Trying fallback provider: ${name}`);
                const result = await fallbackProvider.generateImage(enhancedPrompt, options);
                if (result) {
                    return result;
                }
            }
        }
        // Final fallback: mock image
        console.log('⚠️ All providers failed, generating mock image');
        return this.generateMockImage(options);
    }
    /**
     * Enhance prompt using free AI providers
     */
    async enhancePrompt(options) {
        const prompt = `Enhance this image generation prompt: "${options.prompt}". 
    Make it more detailed and descriptive for an AI image generator. 
    Style: ${options.style}. Return ONLY the enhanced prompt, nothing else.`;
        const result = await this.textProvider.generateText(prompt);
        return result?.trim() || null;
    }
    /**
     * Generate multiple images in batch
     */
    async generateBatch(prompts, style = 'cinematic', provider) {
        try {
            const results = await Promise.all(prompts.map((prompt) => this.generateImage({
                prompt,
                style,
                aspectRatio: '9:16',
                quality: 'high',
                provider,
            })));
            console.log(`✅ Generated ${results.length} images in batch`);
            return results;
        }
        catch (error) {
            console.error('Error in batch image generation:', error);
            return [];
        }
    }
    /**
     * Get stock image search suggestions for a scene
     */
    async getStockImageSuggestions(niche, sceneDescription) {
        try {
            const prompt = `Generate 5-10 stock photo search keywords for a ${niche} video scene.
      Scene description: ${sceneDescription || 'General ' + niche + ' content'}
      
      Return only a JSON array of search keywords/phrases that would work well for finding stock photos.
      Each keyword should be 2-5 words maximum and suitable for stock photo searches.
      Example: ["business meeting", "coffee shop", "sunset landscape"]
      
      Return ONLY the JSON array, nothing else.`;
            const result = await this.textProvider.generateText(prompt);
            if (result) {
                const text = result.trim();
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    try {
                        const suggestions = JSON.parse(jsonMatch[0]);
                        if (Array.isArray(suggestions)) {
                            return suggestions.slice(0, 10);
                        }
                    }
                    catch (e) {
                        console.warn('Failed to parse suggestions JSON:', e);
                    }
                }
            }
            return this.getDefaultSuggestions(niche, sceneDescription);
        }
        catch (error) {
            console.error('Error generating stock suggestions:', error);
            return this.getDefaultSuggestions(niche, sceneDescription);
        }
    }
    /**
     * Get default stock suggestions when AI is unavailable
     */
    getDefaultSuggestions(niche, sceneDescription) {
        const defaults = {
            business: ['office meeting', 'business handshake', 'laptop workspace', 'professional portrait'],
            lifestyle: ['morning coffee', 'urban walking', 'cooking kitchen', 'reading book'],
            travel: ['airport terminal', 'city skyline', 'beach sunset', 'mountain landscape'],
            tech: ['coding laptop', 'smartphone app', 'data center', 'tech startup'],
            fitness: ['gym workout', 'running outdoor', 'yoga pose', 'healthy food'],
            education: ['classroom study', 'library books', 'online learning', 'graduation cap'],
            nature: ['forest path', 'ocean waves', 'flower closeup', 'wildlife animal'],
            food: ['cooking ingredients', 'restaurant dining', 'coffee art', 'fresh produce'],
        };
        const nicheLower = niche.toLowerCase();
        const suggestions = defaults[nicheLower] || defaults.lifestyle;
        if (sceneDescription) {
            const words = sceneDescription.toLowerCase().split(' ').slice(0, 3);
            return [...suggestions, ...words];
        }
        return suggestions;
    }
    /**
     * Generate mock image
     */
    async generateMockImage(options) {
        const colors = this.getGradientForStyle(options.style || 'cinematic');
        const svgContent = `
    <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#grad)"/>
      <text x="540" y="960" font-size="48" fill="white" text-anchor="middle" font-family="Arial">
        ${options.prompt.substring(0, 30)}
      </text>
      <text x="540" y="1020" font-size="24" fill="white" opacity="0.7" text-anchor="middle" font-family="Arial">
        ${options.style} • Mock Generated
      </text>
    </svg>
    `;
        const filename = `image_mock_${Date.now()}_${Math.random().toString(36).substring(7)}.svg`;
        const filepath = path_1.default.join(this.imagesDir, filename);
        await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, svgContent);
        console.log(`🎨 Mock image created: ${filename}`);
        const backendPort = process.env.PORT || '3001';
        const imageUrl = `http://localhost:${backendPort}/images/${filename}`;
        return {
            imageUrl,
            localPath: filepath,
            prompt: options.prompt,
            style: options.style || 'cinematic',
            generatedAt: new Date(),
            provider: 'mock',
        };
    }
    /**
     * Get gradient colors based on style
     */
    getGradientForStyle(style) {
        const gradients = {
            cinematic: { start: '#0f0c29', end: '#302b63' },
            animated: { start: '#FF6B6B', end: '#4ECDC4' },
            minimalist: { start: '#F5F5F5', end: '#CCCCCC' },
            documentary: { start: '#2C3E50', end: '#34495E' },
            stock: { start: '#667EEA', end: '#764BA2' },
        };
        return gradients[style] || gradients.cinematic;
    }
    /**
     * Clean up old images
     */
    async cleanupOldImages(maxAgeDays = 7) {
        try {
            const files = await (0, util_1.promisify)(fs_1.default.readdir)(this.imagesDir);
            const now = Date.now();
            let deletedCount = 0;
            await Promise.all(files.map(async (file) => {
                if (file.startsWith('image_') && (file.endsWith('.svg') || file.endsWith('.jpg') || file.endsWith('.png'))) {
                    const filepath = path_1.default.join(this.imagesDir, file);
                    try {
                        const stats = await (0, util_1.promisify)(fs_1.default.stat)(filepath);
                        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
                        if (ageDays > maxAgeDays) {
                            await (0, util_1.promisify)(fs_1.default.unlink)(filepath);
                            deletedCount++;
                        }
                    }
                    catch (error) {
                        console.warn(`Failed to cleanup file ${file}:`, error);
                    }
                }
            }));
            if (deletedCount > 0) {
                console.log(`🗑️ Cleaned up ${deletedCount} old images`);
            }
            return deletedCount;
        }
        catch (error) {
            console.error('Error cleaning up images:', error);
            return 0;
        }
    }
}
exports.ImageGenerationService = ImageGenerationService;
// Singleton instance
let imageService = null;
/**
 * Pexels Provider - Stock photo search and download
 * Free tier: 200 photos/month
 */
class PexelsProvider {
    constructor(imagesDir) {
        this.name = 'pexels';
        this.imagesDir = imagesDir;
        this.apiKey = process.env.PEXELS_API_KEY;
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_pexels_api_key_here';
    }
    async generateImage(prompt, options) {
        if (!this.isAvailable()) {
            console.log('Pexels API key not configured');
            return null;
        }
        try {
            console.log(`🖼️ Searching Pexels for: "${prompt}"`);
            const dimensions = this.getDimensionsForAspectRatio(options.aspectRatio || '9:16');
            const orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';
            const size = dimensions.width >= 1920 ? 'large' : dimensions.width >= 1280 ? 'medium' : 'small';
            const searchResponse = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(prompt)}&per_page=5&orientation=${orientation}&size=${size}`, {
                method: 'GET',
                headers: {
                    'Authorization': this.apiKey,
                },
            });
            if (!searchResponse.ok) {
                console.error(`Pexels search error: ${searchResponse.status}`);
                return null;
            }
            const searchData = await searchResponse.json();
            if (!searchData.photos || searchData.photos.length === 0) {
                console.log('No photos found on Pexels for this search');
                return null;
            }
            const selectedPhoto = searchData.photos[0];
            const imageUrl = selectedPhoto.src.original || selectedPhoto.src.large;
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const localPath = await this.downloadImage(imageUrl, filename);
            if (!localPath) {
                return null;
            }
            const backendPort = process.env.PORT || '3001';
            const resultUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ Pexels image downloaded: ${filename} (${selectedPhoto.photographer})`);
            return {
                imageUrl: resultUrl,
                localPath,
                prompt: options.prompt,
                style: options.style || 'stock',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Pexels error:', error);
            return null;
        }
    }
    getDimensionsForAspectRatio(aspectRatio) {
        const dimensions = {
            '9:16': { width: 1080, height: 1920 },
            '16:9': { width: 1920, height: 1080 },
            '1:1': { width: 1080, height: 1080 },
        };
        return dimensions[aspectRatio] || dimensions['9:16'];
    }
    async downloadImage(url, filename) {
        return new Promise((resolve) => {
            const filepath = path_1.default.join(this.imagesDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            https_1.default.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Downloaded Pexels image: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download Pexels image: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error('Error downloading Pexels image:', err.message);
                resolve(null);
            });
        });
    }
}
class BytezProvider {
    constructor(imagesDir) {
        this.name = 'bytez';
        this.baseUrl = 'https://api.bytez.com/models/v2';
        this.imagesDir = imagesDir;
        this.apiKey = process.env.BYTEZ_API_KEY;
    }
    isAvailable() {
        return !!this.apiKey && this.apiKey !== 'your_bytez_api_key_here';
    }
    async generateImage(prompt, options) {
        if (!this.isAvailable()) {
            console.log('Bytez API key not configured');
            return null;
        }
        try {
            console.log(`🎨 Generating image with Bytez: "${prompt.substring(0, 50)}..."`);
            const model = options.model || 'stabilityai/stable-diffusion-xl-base-1.0';
            const dimensions = this.getDimensionsForAspectRatio(options.aspectRatio || '9:16');
            const response = await fetch(`${this.baseUrl}/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: prompt,
                    width: dimensions.width,
                    height: dimensions.height,
                    num_images: 1,
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`Bytez API error: ${response.status} - ${error}`);
                return null;
            }
            const data = await response.json();
            let imageUrl;
            if (typeof data.output === 'string') {
                imageUrl = data.output;
            }
            else if (data.output?.images?.[0]) {
                imageUrl = data.output.images[0];
            }
            else if (data.output?.url) {
                imageUrl = data.output.url;
            }
            if (!imageUrl) {
                console.error('No image URL in Bytez response');
                return null;
            }
            const filename = `image_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const localPath = await this.downloadImage(imageUrl, filename);
            if (!localPath) {
                return null;
            }
            const backendPort = process.env.PORT || '3001';
            const resultUrl = `${process.env.BACKEND_URL || `http://localhost:${backendPort}`}/images/${filename}`;
            console.log(`✅ Bytez image generated: ${filename}`);
            return {
                imageUrl: resultUrl,
                localPath,
                prompt: options.prompt,
                style: options.style || 'cinematic',
                generatedAt: new Date(),
                provider: this.name,
            };
        }
        catch (error) {
            console.error('Bytez error:', error);
            return null;
        }
    }
    getDimensionsForAspectRatio(aspectRatio) {
        const dimensions = {
            '9:16': { width: 1024, height: 1024 },
            '16:9': { width: 1024, height: 576 },
            '1:1': { width: 1024, height: 1024 },
        };
        return dimensions[aspectRatio] || dimensions['9:16'];
    }
    async downloadImage(url, filename) {
        return new Promise((resolve) => {
            const filepath = path_1.default.join(this.imagesDir, filename);
            const file = fs_1.default.createWriteStream(filepath);
            https_1.default.get(url, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`💾 Downloaded Bytez image: ${filename}`);
                        resolve(filepath);
                    });
                }
                else {
                    file.close();
                    fs_1.default.unlink(filepath, () => { });
                    console.error(`Failed to download Bytez image: ${response.statusCode}`);
                    resolve(null);
                }
            }).on('error', (err) => {
                file.close();
                fs_1.default.unlink(filepath, () => { });
                console.error('Error downloading Bytez image:', err.message);
                resolve(null);
            });
        });
    }
}
function getImageGenerationService() {
    if (!imageService) {
        imageService = new ImageGenerationService();
    }
    return imageService;
}
//# sourceMappingURL=imageService.js.map
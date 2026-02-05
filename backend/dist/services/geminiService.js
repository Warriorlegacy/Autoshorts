"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
// Mock data for development
const MOCK_SCRIPTS = {
    'technology': {
        title: 'Top 5 AI Breakthroughs You Need to Know',
        caption: 'Discover the latest AI innovations transforming our world. From ChatGPT to new models, AI is evolving faster than ever. Ready to stay ahead?',
        hashtags: ['AI', 'Technology', 'Innovation', 'FutureOfAI', 'TechTrends', 'MachineLearning', 'DigitalTransformation', 'TechNews', 'AIRevolution', 'Innovation2025'],
        scenes: [
            {
                id: '1',
                duration: 10,
                narration: 'AI is advancing at lightning speed!',
                textOverlay: 'AI Breakthroughs 2025',
                background: {
                    type: 'gradient',
                    source: 'linear-gradient(135deg, #0010FF 0%, #7C3AED 100%)'
                }
            },
            {
                id: '2',
                duration: 10,
                narration: 'ChatGPT now has real-time web access',
                textOverlay: 'ChatGPT 4.5',
                background: {
                    type: 'gradient',
                    source: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)'
                }
            },
            {
                id: '3',
                duration: 10,
                narration: 'New multimodal models can understand anything',
                textOverlay: 'Multimodal AI',
                background: {
                    type: 'gradient',
                    source: 'linear-gradient(135deg, #EC4899 0%, #F43F5E 100%)'
                }
            }
        ]
    },
    'fitness': {
        title: '7-Minute Full Body Workout at Home',
        caption: 'No gym? No problem! Transform your body with this quick home workout. No equipment needed.',
        hashtags: ['Fitness', 'Workout', 'HealthyLifestyle', 'FitnessTips', 'HomeWorkout', 'ExerciseRoutine', 'Wellness', 'FitnessMotivation', 'Training', 'Health'],
        scenes: [
            {
                id: '1',
                duration: 8,
                narration: 'Ready for a quick full-body workout?',
                textOverlay: '7-Minute Full Body',
                background: {
                    type: 'gradient',
                    source: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                }
            },
            {
                id: '2',
                duration: 8,
                narration: 'Start with 30 seconds of jumping jacks!',
                textOverlay: 'Warm Up',
                background: {
                    type: 'gradient',
                    source: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                }
            },
            {
                id: '3',
                duration: 8,
                narration: 'No equipment needed. Transform your body today!',
                textOverlay: 'Let\'s Go!',
                background: {
                    type: 'gradient',
                    source: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                }
            }
        ]
    }
};
class GeminiService {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        this.useMock = !apiKey || apiKey === 'your_gemini_api_key_here';
        if (!this.useMock) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
            this.visionModel = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
        }
        else {
            console.log('Using mock Gemini service (set GEMINI_API_KEY for real AI)');
            this.model = null;
            this.visionModel = null;
        }
    }
    async generateScript(niche, duration) {
        if (this.useMock) {
            return this.getMockScript(niche);
        }
        const prompt = `Generate an engaging ${duration}-second video script about ${niche}.`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson);
        }
        catch (error) {
            console.error('Error generating script:', error);
            throw new Error('Failed to generate script');
        }
    }
    async generateTitle(niche) {
        if (this.useMock) {
            const script = this.getMockScript(niche);
            return [script.title];
        }
        const prompt = `Generate 5 viral-worthy titles for a short-form video about ${niche}.`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson);
        }
        catch (error) {
            console.error('Error generating titles:', error);
            throw new Error('Failed to generate titles');
        }
    }
    async generateHashtags(niche, content) {
        if (this.useMock) {
            const script = this.getMockScript(niche);
            return script.hashtags;
        }
        const prompt = `Generate 10 relevant hashtags for a short-form video about ${niche}.`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson);
        }
        catch (error) {
            console.error('Error generating hashtags:', error);
            throw new Error('Failed to generate hashtags');
        }
    }
    async generateImagePrompt(sceneDescription, style) {
        if (this.useMock) {
            return `Professional ${style} style image: ${sceneDescription}. 9:16 vertical format.`;
        }
        const prompt = `Create a detailed image generation prompt for a video scene.`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        }
        catch (error) {
            console.error('Error generating image prompt:', error);
            throw new Error('Failed to generate image prompt');
        }
    }
    async analyzeImage(imageData) {
        if (this.useMock) {
            return ['Create a tutorial series', 'Share interesting facts', 'Tell a story'];
        }
        const prompt = `Analyze this image and suggest 5 video topics.`;
        try {
            const result = await this.visionModel.generateContent([prompt, imageData]);
            const response = await result.response;
            const text = response.text();
            const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanJson);
        }
        catch (error) {
            console.error('Error analyzing image:', error);
            throw new Error('Failed to analyze image');
        }
    }
    getMockScript(niche) {
        const nicheLower = niche.toLowerCase();
        if (MOCK_SCRIPTS[nicheLower]) {
            return MOCK_SCRIPTS[nicheLower];
        }
        for (const [key, script] of Object.entries(MOCK_SCRIPTS)) {
            if (nicheLower.includes(key) || key.includes(nicheLower)) {
                return script;
            }
        }
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        ];
        return {
            title: `Amazing ${niche} Facts You Never Knew`,
            caption: `Discover fascinating insights about ${niche}. You won't believe this!`,
            hashtags: [niche.replace(/\s+/g, ''), 'Facts', 'Learning', 'Trending', 'MustWatch'],
            scenes: [
                {
                    id: '1',
                    duration: 10,
                    narration: `Get ready to learn about ${niche}!`,
                    textOverlay: `${niche} Explained`,
                    background: {
                        type: 'gradient',
                        source: gradients[0]
                    }
                },
                {
                    id: '2',
                    duration: 10,
                    narration: `Here's the first amazing thing you need to know`,
                    textOverlay: 'Fact #1',
                    background: {
                        type: 'gradient',
                        source: gradients[1]
                    }
                },
                {
                    id: '3',
                    duration: 10,
                    narration: `The second fact will blow your mind`,
                    textOverlay: 'Fact #2',
                    background: {
                        type: 'gradient',
                        source: gradients[2]
                    }
                },
                {
                    id: '4',
                    duration: 10,
                    narration: `And finally, the most important discovery`,
                    textOverlay: 'Final Insight',
                    background: {
                        type: 'gradient',
                        source: gradients[3]
                    }
                }
            ]
        };
    }
}
exports.GeminiService = GeminiService;
//# sourceMappingURL=geminiService.js.map
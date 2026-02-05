import Groq from 'groq-sdk';
import { SCRIPT_PROVIDERS, SERVICE_URLS, API_KEYS } from '../constants/config';

// Type definitions for API responses
interface OpenAIStyleResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Type definitions for different providers
interface ScriptProvider {
  name: string;
  generateScript(niche: string, duration: 30 | 60, options?: any): Promise<any>;
  generateTitle(niche: string): Promise<string[]>;
  generateHashtags(niche: string, content: string): Promise<string[]>;
  isAvailable(): boolean;
}

// Mock data for development
const MOCK_SCRIPTS: { [key: string]: any } = {
  'technology': {
    title: 'Top 5 AI Breakthroughs You Need to Know',
    caption: 'Discover the latest AI innovations transforming our world.',
    hashtags: ['AI', 'Technology', 'Innovation', 'FutureOfAI', 'TechTrends'],
    scenes: [
      {
        id: '1',
        duration: 10,
        narration: 'AI is advancing at lightning speed!',
        textOverlay: 'AI Breakthroughs 2025',
        background: { type: 'gradient', source: 'linear-gradient(135deg, #0010FF 0%, #7C3AED 100%)' }
      },
    ]
  },
  'fitness': {
    title: '7-Minute Full Body Workout at Home',
    caption: 'No gym? No problem! Transform your body with this quick workout.',
    hashtags: ['Fitness', 'Workout', 'HealthyLifestyle', 'HomeWorkout'],
    scenes: [
      {
        id: '1',
        duration: 8,
        narration: 'Ready for a quick full-body workout?',
        textOverlay: '7-Minute Full Body',
        background: { type: 'gradient', source: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }
      },
    ]
  }
};

/**
 * Groq Provider - Free tier: 1,500 req/day
 */
class GroqProvider implements ScriptProvider {
  name = 'groq';
  private client: Groq | null;

  constructor() {
    const apiKey = API_KEYS.GROQ;
    if (apiKey && apiKey !== 'your_groq_api_key_here') {
      this.client = new Groq({ apiKey });
    } else {
      this.client = null;
    }
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async generateScript(niche: string, duration: 30 | 60, modelName?: string): Promise<any> {
    if (!this.client) throw new Error('Groq not configured');

    const model = modelName || 'llama-3.1-8b-instant';
    
    const prompt = `Generate an engaging ${duration}-second video script about ${niche}. 
    Return a JSON object with this structure:
    {
      "title": "Video Title",
      "caption": "Video caption for social media",
      "hashtags": ["tag1", "tag2", "tag3"],
      "scenes": [
        {
          "id": "1",
          "duration": 10,
          "narration": "Voiceover text",
          "textOverlay": "Text shown on screen",
          "background": { "type": "gradient", "source": "linear-gradient(...)" }
        }
      ]
    }`;

    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a creative video script writer. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      model: model,
      temperature: 0.7,
      max_tokens: 2048,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0]?.message?.content || '';
    return JSON.parse(text);
  }

  async generateTitle(niche: string): Promise<string[]> {
    if (!this.client) return [MOCK_SCRIPTS['technology'].title];

    const prompt = `Generate 5 viral-worthy titles for a short-form video about ${niche}. Return as JSON array.`;
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: "Return only a JSON array of strings." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      max_tokens: 512,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.titles || [parsed.title];
  }

  async generateHashtags(niche: string, content: string): Promise<string[]> {
    if (!this.client) return MOCK_SCRIPTS['technology'].hashtags;

    const prompt = `Generate 10 relevant hashtags for a short-form video about ${niche}. Return as JSON array.`;
    const completion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: "Return only a JSON array of strings." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 512,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : parsed.hashtags || [];
  }
}

/**
 * OpenRouter Provider - Free tier with various models
 */
class OpenRouterProvider implements ScriptProvider {
  name = 'openrouter';
  private apiKey: string | null;

  constructor() {
    this.apiKey = API_KEYS.OPENROUTER || null;
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_openrouter_api_key_here';
  }

  async generateScript(niche: string, duration: 30 | 60, modelName?: string): Promise<any> {
    if (!this.apiKey) throw new Error('OpenRouter not configured');

    const model = modelName || SCRIPT_PROVIDERS.AVAILABLE.OPENROUTER.models.fast;
    
    const response = await fetch(`${SERVICE_URLS.OPENROUTER_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'AutoShorts'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "You are a creative video script writer. Always respond with valid JSON only." },
          { role: "user", content: `Generate an engaging ${duration}-second video script about ${niche}. Return JSON with title, caption, hashtags, and scenes array.` }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json() as OpenAIStyleResponse;
    const text = data.choices[0]?.message?.content || '';
    return JSON.parse(text);
  }

  async generateTitle(niche: string): Promise<string[]> {
    if (!this.apiKey) return ['Title'];

    const model = SCRIPT_PROVIDERS.AVAILABLE.OPENROUTER.models.fast;
    
    const response = await fetch(`${SERVICE_URLS.OPENROUTER_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: `Generate 5 viral-worthy titles for a short-form video about ${niche}. Return as JSON array.` }
        ],
      }),
    });

    const data = await response.json() as OpenAIStyleResponse;
    const text = data.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  async generateHashtags(niche: string, content: string): Promise<string[]> {
    if (!this.apiKey) return [];

    const model = SCRIPT_PROVIDERS.AVAILABLE.OPENROUTER.models.fast;
    
    const response = await fetch(`${SERVICE_URLS.OPENROUTER_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: `Generate 10 relevant hashtags for a short-form video about ${niche}. Return as JSON array.` }
        ],
      }),
    });

    const data = await response.json() as OpenAIStyleResponse;
    const text = data.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  }
}

/**
 * Together AI Provider - Free tier: $5 credit
 */
class TogetherProvider implements ScriptProvider {
  name = 'together';
  private apiKey: string | null;

  constructor() {
    this.apiKey = API_KEYS.TOGETHER || null;
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_together_api_key_here';
  }

  async generateScript(niche: string, duration: 30 | 60, modelName?: string): Promise<any> {
    if (!this.apiKey) throw new Error('Together AI not configured');

    const model = modelName || SCRIPT_PROVIDERS.AVAILABLE.TOGETHER.models.fast;
    
    const response = await fetch(`${SERVICE_URLS.TOGETHER_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: "You are a creative video script writer. Always respond with valid JSON only." },
          { role: "user", content: `Generate an engaging ${duration}-second video script about ${niche}. Return JSON with title, caption, hashtags, and scenes array.` }
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`Together AI API error: ${response.status}`);
    }

    const data = await response.json() as OpenAIStyleResponse;
    const text = data.choices[0]?.message?.content || '';
    return JSON.parse(text);
  }

  async generateTitle(niche: string): Promise<string[]> {
    if (!this.apiKey) return ['Title'];

    const model = SCRIPT_PROVIDERS.AVAILABLE.TOGETHER.models.fast;
    
    const response = await fetch(`${SERVICE_URLS.TOGETHER_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: `Generate 5 viral-worthy titles for a short-form video about ${niche}. Return as JSON array.` }
        ],
      }),
    });

    const data = await response.json() as OpenAIStyleResponse;
    const text = data.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  async generateHashtags(niche: string, content: string): Promise<string[]> {
    if (!this.apiKey) return [];

    const model = SCRIPT_PROVIDERS.AVAILABLE.TOGETHER.models.fast;
    
    const response = await fetch(`${SERVICE_URLS.TOGETHER_API}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: `Generate 10 relevant hashtags for a short-form video about ${niche}. Return as JSON array.` }
        ],
      }),
    });

    const data = await response.json() as OpenAIStyleResponse;
    const text = data.choices[0]?.message?.content || '';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  }
}

/**
 * Multi-Provider Script Generation Service
 */
export class ScriptService {
  private providers: Map<string, ScriptProvider>;
  private defaultProvider: string;

  constructor() {
    // Initialize providers
    this.providers = new Map();
    this.providers.set('groq', new GroqProvider());
    this.providers.set('openrouter', new OpenRouterProvider());
    this.providers.set('together', new TogetherProvider());

    // Set default from config
    this.defaultProvider = SCRIPT_PROVIDERS.DEFAULT;

    // Log available providers
    console.log('🤖 Script Generation Providers:');
    this.providers.forEach((provider, name) => {
      const available = provider.isAvailable() ? '✅' : '❌';
      console.log(`   ${available} ${name}`);
    });
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): { name: string; available: boolean }[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      available: provider.isAvailable(),
    }));
  }

  /**
   * Generate script with provider selection
   */
  async generateScript(niche: string, duration: 30 | 60, providerName?: string, modelName?: string): Promise<any> {
    const providerToUse = providerName || this.defaultProvider;
    console.log(`🎬 Generating script with provider: ${providerToUse}, model: ${modelName || 'default'}`);

    const provider = this.providers.get(providerToUse);
    
    if (provider && provider.isAvailable()) {
      try {
        const result = await provider.generateScript(niche, duration, modelName);
        console.log(`✅ Script generated with ${providerToUse}`);
        return result;
      } catch (error) {
        console.error(`❌ ${providerToUse} failed:`, error);
        // Try fallback providers
      }
    }

    // Try fallback providers
    for (const [name, fallbackProvider] of this.providers) {
      if (name !== providerToUse && fallbackProvider.isAvailable()) {
        console.log(`🔄 Trying fallback provider: ${name}`);
        try {
          const result = await fallbackProvider.generateScript(niche, duration);
          console.log(`✅ Script generated with fallback: ${name}`);
          return result;
        } catch (error) {
          console.error(`❌ ${name} also failed:`, error);
        }
      }
    }

    // Final fallback: mock script
    console.log('⚠️ All providers failed, using mock script');
    return this.getMockScript(niche);
  }

  async generateTitle(niche: string, providerName?: string): Promise<string[]> {
    const providerToUse = providerName || this.defaultProvider;
    const provider = this.providers.get(providerToUse);
    
    if (provider && provider.isAvailable()) {
      try {
        return await provider.generateTitle(niche);
      } catch (error) {
        console.error('Title generation failed:', error);
      }
    }
    
    return ['Amazing Video About ' + niche];
  }

  async generateHashtags(niche: string, content: string, providerName?: string): Promise<string[]> {
    const providerToUse = providerName || this.defaultProvider;
    const provider = this.providers.get(providerToUse);
    
    if (provider && provider.isAvailable()) {
      try {
        return await provider.generateHashtags(niche, content);
      } catch (error) {
        console.error('Hashtag generation failed:', error);
      }
    }
    
    return [niche.replace(/\s+/g, ''), 'Video', 'Trending'];
  }

  private getMockScript(niche: string): any {
    const nicheLower = niche.toLowerCase();
    
    if (MOCK_SCRIPTS[nicheLower]) {
      return MOCK_SCRIPTS[nicheLower];
    }

    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    ];

    return {
      title: `Amazing ${niche} Facts You Never Knew`,
      caption: `Discover fascinating insights about ${niche}.`,
      hashtags: [niche.replace(/\s+/g, ''), 'Facts', 'Learning', 'Trending'],
      scenes: [
        {
          id: '1',
          duration: 10,
          narration: `Get ready to learn about ${niche}!`,
          textOverlay: `${niche} Explained`,
          background: { type: 'gradient', source: gradients[0] }
        },
      ]
    };
  }
}

// Keep GeminiService as an alias for backward compatibility
export { ScriptService as GeminiService };

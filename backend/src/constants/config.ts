/**
 * Centralized configuration and constants
 */

export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET,
  EXPIRATION: process.env.JWT_EXPIRATION || '7d',
  validate: () => {
    if (!process.env.JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET environment variable not set.');
    }
  }
};

export const SERVER_CONFIG = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export const DB_CONFIG = {
  PATH: process.env.DB_PATH || 'autoshorts.db',
};

export const SERVICE_URLS = {
  POLLINATIONS_AI: 'https://image.pollinations.ai',
  HUGGINGFACE_API: 'https://api-inference.huggingface.co/models',
  REPLICATE_API: 'https://api.replicate.com/v1',
  BYTEZ_API: 'https://api.bytez.com/models/v2',
  GROQ_API: 'https://api.groq.com/openai/v1',
  OPENROUTER_API: 'https://openrouter.ai/api/v1',
  TOGETHER_API: 'https://api.together.ai/v1',
  ELEVENLABS_API: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io',
  EDGE_TTS: 'local',
  MURF_API: 'https://api.murf.ai/v1',
  SKYREELS_API: 'https://api.apifree.ai/v1',
  HEYGEN_API: 'https://api.heygen.com',
  FAL_API: 'https://api.fal.ai/v1',
  RUNWAYML_API: 'https://api.runwayml.com/v1',
};

export const API_KEYS = {
  get LEONARDO() { return process.env.LEONARDO_API_KEY; },
  get HUGGINGFACE() { return process.env.HUGGINGFACE_API_KEY; },
  get REPLICATE() { return process.env.REPLICATE_API_KEY; },
  get POLLINATION() { return process.env.POLLINATION_API_KEY; },
  get PEXELS() { return process.env.PEXELS_API_KEY; },
  get BYTEZ() { return process.env.BYTEZ_API_KEY; },
  get GROQ() { return process.env.GROQ_API_KEY; },
  get OPENROUTER() { return process.env.OPENROUTER_API_KEY; },
  get TOGETHER() { return process.env.TOGETHER_API_KEY; },
  get SKYREELS() { return process.env.SKYREELS_API_KEY; },
  get HEYGEN() { return process.env.HEYGEN_API_KEY; },
  get MURF() { return process.env.MURF_API_KEY; },
  get FAL() { return process.env.FAL_API_KEY; },
  get RUNWAYML() { return process.env.RUNWAYML_API_KEY; },
};

export const OAUTH_CONFIG = {
  YOUTUBE: {
    CLIENT_ID: process.env.YOUTUBE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/api/youtube/callback',
  },
  INSTAGRAM: {
    APP_ID: process.env.INSTAGRAM_APP_ID || '',
    APP_SECRET: process.env.INSTAGRAM_APP_SECRET || '',
    REDIRECT_URI: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3001/api/instagram/callback',
  },
};

export const STORAGE_CONFIG = {
  UPLOADS_DIR: 'uploads',
  TEMP_DIR: 'temp',
  RENDERS_DIR: 'renders',
};

export const VIDEO_CONFIG = {
  DEFAULT_DURATION: 30,
  MAX_DURATION: 60,
  DEFAULT_FPS: 30,
  DEFAULT_WIDTH: 1080,
  DEFAULT_HEIGHT: 1920,
};

export const LOG_CONFIG = {
  LEVEL: process.env.LOG_LEVEL || 'info',
};

export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  TTS_MAX_REQUESTS: parseInt(process.env.TTS_MAX_REQUESTS || '20', 10),
  IMAGE_MAX_REQUESTS: parseInt(process.env.IMAGE_MAX_REQUESTS || '50', 10),
};

export const IMAGE_PROVIDERS = {
  DEFAULT: 'pollinations',
  AVAILABLE: {
    POLLINATIONS: { name: 'Pollinations AI', models: ['default'] },
    PEXELS: { name: 'Pexels', models: ['default'] },
    HUGGINGFACE: { name: 'HuggingFace', models: ['default'] },
    FAL: { name: 'Fal AI', models: ['flux'] },
  }
};

export const FREE_SERVICES = {
  FLUX: { MODEL: 'black-forest-labs/flux-schnell' },
  POLLINATIONS: 'pollinations',
  PEXELS: 'pexels',
  HUGGINGFACE: 'huggingface',
  GROQ: 'groq',
  MURF: 'murf',
  LIST: ['pollinations', 'pexels', 'huggingface', 'groq', 'murf']
};

export const SCRIPT_PROVIDERS = {
  DEFAULT: 'groq',
  AVAILABLE: {
    GROQ: {
      name: 'Groq',
      models: {
        fast: 'llama-3.3-70b-versatile',
        cheap: 'llama-3.1-8b-instant'
      }
    },
    OPENROUTER: {
      name: 'OpenRouter',
      models: {
        fast: 'anthropic/claude-3-haiku',
        cheap: 'google/gemini-2.0-flash-exp'
      }
    },
    TOGETHER: {
      name: 'Together AI',
      models: {
        fast: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        cheap: 'meta-llama/Llama-3.1-8B-Instruct-Turbo'
      }
    },
    MOCK: { name: 'Mock', models: { fast: 'default', cheap: 'default' } }
  }
};

export const CONFIG = {
  JWT: JWT_CONFIG,
  SERVER: SERVER_CONFIG,
  DB: DB_CONFIG,
  SERVICES: SERVICE_URLS,
  KEYS: API_KEYS,
  OAUTH: OAUTH_CONFIG,
  STORAGE: STORAGE_CONFIG,
  VIDEO: VIDEO_CONFIG,
  validate: () => {
    JWT_CONFIG.validate();
  }
};

export default CONFIG;

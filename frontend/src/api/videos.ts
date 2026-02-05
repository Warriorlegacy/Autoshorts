const API_BASE_URL = '/api/videos';

export interface GenerateVideoRequest {
  niche: string;
  language: string;
  duration: 30 | 60;
  visualStyle: string;
  contentSource?: 'auto' | 'prompt' | 'image';
  prompt?: string;
  voiceName?: string;
  speakingRate?: number;
  generateImages?: boolean;
  scriptProvider?: string;
  scriptModel?: string;
  imageProvider?: string;
  imageModel?: string;
}

export interface TextToVideoRequest {
  prompt: string;
  images?: string[];
  duration: 30 | 60;
  style?: string;
  language?: string;
  voiceName?: string;
  speakingRate?: number;
}

export interface VideoPreview {
  title: string;
  caption: string;
  hashtags: string[];
  scenes: any[];
  duration: number;
  hasImages: boolean;
}

export interface Video {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  niche: string;
  duration: number;
  visualStyle: string;
  status: 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueuedVideo {
  id: string;
  videoId: string;
  title: string;
  platforms: string[];
  scheduledAt: string;
  status: 'queued' | 'processing' | 'posted' | 'failed';
  createdAt: string;
}

export interface GenerateVideoResponse {
  success: boolean;
  videoId: string;
  message: string;
  content: {
    title: string;
    caption: string;
    hashtags: string[];
    scenes: any[];
  };
}

const getAuthHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export const videoAPI = {
  generate: async (request: GenerateVideoRequest): Promise<GenerateVideoResponse> => {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Video generation failed');
    }

    return response.json();
  },

  getVideos: async (page = 1, limit = 10): Promise<{ success: boolean; videos: Video[]; pagination: any }> => {
    const response = await fetch(`${API_BASE_URL}?page=${page}&limit=${limit}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch videos');
    }

    return response.json();
  },

  getVideo: async (videoId: string): Promise<{ success: boolean; video: Video }> => {
    const response = await fetch(`${API_BASE_URL}/${videoId}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }

    return response.json();
  },

  getVideoStatus: async (videoId: string): Promise<{ success: boolean; video: Partial<Video> }> => {
    const response = await fetch(`${API_BASE_URL}/${videoId}/status`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch video status');
    }

    return response.json();
  },

  deleteVideo: async (videoId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/${videoId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete video');
    }

    return response.json();
  },

  // NEW: Regenerate video with same parameters
  regenerateVideo: async (videoId: string): Promise<GenerateVideoResponse> => {
    const response = await fetch(`${API_BASE_URL}/${videoId}/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Video regeneration failed');
    }

    return response.json();
  },

  // NEW: Add video to queue for scheduling
  addToQueue: async (videoId: string, platforms: string[], scheduledAt: string): Promise<{ success: boolean; queuedVideo: QueuedVideo }> => {
    const response = await fetch(`${API_BASE_URL}/${videoId}/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ platforms, scheduledAt }),
    });

    if (!response.ok) {
      throw new Error('Failed to add video to queue');
    }

    return response.json();
  },

  // NEW: Fetch queued videos
  getQueuedVideos: async (): Promise<{ success: boolean; videos: QueuedVideo[] }> => {
    const response = await fetch('/api/queue', {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch queued videos');
    }

    const data = await response.json();
    // Map backend response (queuedVideos) to frontend expected format (videos)
    return {
      success: data.success,
      videos: data.queuedVideos || [],
    };
  },

  // NEW: Remove video from queue
  removeFromQueue: async (queueId: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`/api/queue/${queueId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to remove from queue');
    }

    return response.json();
  },

  // NEW: Text-to-video generation
  generateTextToVideo: async (request: TextToVideoRequest): Promise<GenerateVideoResponse> => {
    const response = await fetch(`${API_BASE_URL}/text-to-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Text-to-video generation failed');
    }

    return response.json();
  },

  // NEW: Preview video before generation
  previewVideo: async (request: Omit<TextToVideoRequest, 'voiceName' | 'speakingRate'>): Promise<{ success: boolean; preview: VideoPreview }> => {
    const response = await fetch(`${API_BASE_URL}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to generate preview');
    }

    return response.json();
  },

  // NEW: Get available providers
  getProviders: async (): Promise<{
    success: boolean;
    providers: {
      script: any[];
      image: any[];
      avatar: any[];
    };
    defaults: {
      script: string;
      image: string;
      avatar: string;
    };
  }> => {
    const response = await fetch(`${API_BASE_URL}/providers`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch providers');
    }

    return response.json();
  },

  // AI Video Generation APIs
  getAIVideoProviders: async (): Promise<{
    success: boolean;
    providers: Array<{
      id: string;
      name: string;
      description: string;
      requiresKey: boolean;
      keyName: string;
      url: string;
      available: boolean;
      pricing: string;
      models: Array<{
        id: string;
        name: string;
        description: string;
        type: string;
      }>;
    }>;
    defaults: {
      free: string;
      paid: string;
    };
  }> => {
    const response = await fetch(`${API_BASE_URL}/ai-video/providers`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI video providers');
    }

    return response.json();
  },

  generateAIVideo: async (request: {
    prompt: string;
    provider: 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels';
    model?: string;
    duration?: number;
    width?: number;
    height?: number;
    negativePrompt?: string;
    avatarId?: string;
    avatarImage?: string;
    audioUrl?: string;
  }): Promise<{
    success: boolean;
    videoId: string;
    message: string;
    status: string;
    requestId: string;
    videoUrl?: string;
    provider: string;
    model: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/ai-video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'AI video generation failed');
    }

    return response.json();
  },

  checkAIVideoStatus: async (requestId: string, provider: 'bytez' | 'fal' | 'replicate'): Promise<{
    success: boolean;
    status: string;
    videoUrl?: string;
    error?: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/ai-video/status/${requestId}?provider=${provider}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to check AI video status');
    }

    return response.json();
  },

  testAIVideoProvider: async (provider: 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels'): Promise<{
    success: boolean;
    provider: string;
    status: string;
    requestId: string;
    videoUrl?: string;
    error?: string;
  }> => {
    const response = await fetch(`${API_BASE_URL}/ai-video/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ provider }),
    });

    if (!response.ok) {
      throw new Error('Failed to test AI video provider');
    }

    return response.json();
  },
};

export interface SocialAccount {
  platform: 'youtube' | 'instagram';
  isConnected: boolean;
  username?: string;
  displayName?: string;
  profileImage?: string;
}

export interface PostResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export const socialAPI = {
  getConnectedAccounts: async (): Promise<{ success: boolean; accounts: SocialAccount[] }> => {
    const response = await fetch('/api/social/accounts', {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch connected accounts');
    }

    return response.json();
  },

  getPlatformStatus: async (platform: 'youtube' | 'instagram'): Promise<{ success: boolean; platform: string; isConnected: boolean }> => {
    const response = await fetch(`/api/social/status/${platform}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get ${platform} status`);
    }

    return response.json();
  },

  disconnectPlatform: async (platform: 'youtube' | 'instagram'): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`/api/social/disconnect/${platform}`, {
      method: 'POST',
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error(`Failed to disconnect ${platform}`);
    }

    return response.json();
  },

  postVideo: async (request: {
    videoPath: string;
    title: string;
    description: string;
    hashtags: string[];
    platforms: ('youtube' | 'instagram')[];
  }): Promise<{ success: boolean; message: string; results: PostResult[] }> => {
    const response = await fetch('/api/social/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to post video');
    }

    return response.json();
  },

  getUploadHistory: async (limit = 20): Promise<{ success: boolean; history: any[] }> => {
    const response = await fetch(`/api/social/history?limit=${limit}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch upload history');
    }

    return response.json();
  },
};

export const youtubeAPI = {
  getAuthUrl: async (): Promise<{ success: boolean; authUrl: string }> => {
    const response = await fetch('/api/youtube/auth', {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get YouTube auth URL');
    }

    return response.json();
  },

  getChannelInfo: async (): Promise<{
    success: boolean;
    data: {
      id: string;
      title: string;
      description: string;
      thumbnail: string;
    };
  }> => {
    const response = await fetch('/api/youtube/channel', {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get YouTube channel info');
    }

    return response.json();
  },

  disconnect: async (): Promise<{ success: boolean; message: string }> => {
    const response = await fetch('/api/youtube/disconnect', {
      method: 'DELETE',
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to disconnect YouTube');
    }

    return response.json();
  },

  uploadVideo: async (request: {
    videoPath: string;
    title: string;
    description: string;
    tags: string[];
    privacyStatus?: 'public' | 'private' | 'unlisted';
  }): Promise<{
    success: boolean;
    data: {
      uploadId: string;
      videoId: string;
      videoUrl: string;
    };
  }> => {
    const response = await fetch('/api/youtube/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to upload video to YouTube');
    }

    return response.json();
  },
};
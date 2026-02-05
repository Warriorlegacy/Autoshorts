const API_BASE_URL = '/api/videos/avatar';

export interface AvatarGenerateRequest {
  avatarImage?: string;
  audioSource: 'tts' | 'upload';
  script?: string;
  voiceName?: string;
  language?: string;
  speakingRate?: number;
  prompt?: string;
  customAudioUrl?: string;
  provider?: 'skyreels' | 'skyreels-text';
}

export interface AvatarGenerateResponse {
  success: boolean;
  videoId: string;
  requestId: string;
  message: string;
  status: string;
  content: {
    title: string;
    audioUrl: string;
    avatarImage: string;
  };
}

export interface AvatarStatusResponse {
  success: boolean;
  requestId: string;
  status: string;
  videoId: string;
  videoStatus: string;
  error?: string;
}

export interface AvatarResultResponse {
  success: boolean;
  requestId: string;
  status: string;
  videos: Array<{ url: string }>;
  usage?: { cost: number };
}

const getAuthHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export const avatarAPI = {
  generate: async (request: AvatarGenerateRequest): Promise<AvatarGenerateResponse> => {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Avatar video generation failed');
    }

    return response.json();
  },

  getStatus: async (requestId: string): Promise<AvatarStatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/status/${requestId}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get avatar status');
    }

    return response.json();
  },

  getResult: async (requestId: string): Promise<AvatarResultResponse> => {
    const response = await fetch(`${API_BASE_URL}/result/${requestId}`, {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      throw new Error('Failed to get avatar result');
    }

    return response.json();
  },
};

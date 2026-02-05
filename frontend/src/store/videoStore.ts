import { create } from 'zustand';
import { videoAPI, Video, GenerateVideoRequest, QueuedVideo, TextToVideoRequest } from '../api/videos';
import { avatarAPI, AvatarGenerateRequest } from '../api/avatar';

interface VideoState {
  videos: Video[];
  currentVideo: Video | null;
  queuedVideos: QueuedVideo[];
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  avatarStatus: 'idle' | 'processing' | 'success' | 'error';
  avatarProgress: number;
  generateVideo: (request: GenerateVideoRequest) => Promise<string | null>;
  generateTextToVideo: (request: TextToVideoRequest) => Promise<string | null>;
  generateAvatarVideo: (request: AvatarGenerateRequest) => Promise<string | null>;
  pollAvatarStatus: (requestId: string, onComplete: (videoUrl: string) => void) => Promise<void>;
  fetchVideos: (page?: number, limit?: number) => Promise<void>;
  fetchVideo: (videoId: string) => Promise<void>;
  regenerateVideo: (videoId: string) => Promise<void>;
  addToQueue: (videoId: string, platforms: string[], scheduledAt: string) => Promise<void>;
  fetchQueuedVideos: () => Promise<void>;
  removeFromQueue: (queueId: string) => Promise<void>;
  deleteVideo: (videoId: string) => Promise<void>;
  clearError: () => void;
  setCurrentVideo: (video: Video | null) => void;
  resetAvatarStatus: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: [],
  currentVideo: null,
  queuedVideos: [],
  isGenerating: false,
  isLoading: false,
  error: null,
  avatarStatus: 'idle',
  avatarProgress: 0,

  // Generate traditional niche-based video
  generateVideo: async (request: GenerateVideoRequest) => {
    try {
      set({ isGenerating: true, error: null });
      const response = await videoAPI.generate(request);
      const newVideo: Video = {
        id: response.videoId,
        title: response.content.title,
        caption: response.content.caption,
        hashtags: response.content.hashtags,
        niche: request.niche,
        duration: request.duration,
        visualStyle: request.visualStyle,
        status: 'generating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videoUrl: undefined,
        thumbnailUrl: undefined,
      };
      set((state) => ({ videos: [newVideo, ...state.videos], isGenerating: false }));
      return response.videoId;
    } catch (error: any) {
      set({ error: error.message || 'Video generation failed', isGenerating: false });
      return null;
    }
  },

  // Generate text-to-video using Ollama
  generateTextToVideo: async (request: TextToVideoRequest) => {
    try {
      set({ isGenerating: true, error: null });
      const response = await videoAPI.generateTextToVideo(request);
      const newVideo: Video = {
        id: response.videoId,
        title: response.content.title,
        caption: response.content.caption,
        hashtags: response.content.hashtags,
        niche: 'text-to-video',
        duration: request.duration,
        visualStyle: request.style || 'modern',
        status: 'generating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videoUrl: undefined,
        thumbnailUrl: undefined,
      };
      set((state) => ({ videos: [newVideo, ...state.videos], isGenerating: false }));
      return response.videoId;
    } catch (error: any) {
      set({ error: error.message || 'Text-to-video generation failed', isGenerating: false });
      // Re-throw the error so it can be caught by the component
      throw error;
    }
  },

  fetchVideos: async (page = 1, limit = 10) => {
    try {
      set({ isLoading: true, error: null });
      const response = await videoAPI.getVideos(page, limit);
      set({ videos: response.videos, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch videos', isLoading: false });
    }
  },

  fetchVideo: async (videoId: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await videoAPI.getVideo(videoId);
      set({ currentVideo: response.video, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch video', isLoading: false });
    }
  },

  regenerateVideo: async (videoId: string) => {
    try {
      set({ isGenerating: true, error: null });
      const response = await videoAPI.regenerateVideo(videoId);
      set((state) => ({
        currentVideo: state.currentVideo ? { ...state.currentVideo, id: response.videoId, status: 'generating', updatedAt: new Date().toISOString() } : null,
        isGenerating: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to regenerate video', isGenerating: false });
    }
  },

  addToQueue: async (videoId: string, platforms: string[], scheduledAt: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await videoAPI.addToQueue(videoId, platforms, scheduledAt);
      set((state) => ({ queuedVideos: [response.queuedVideo, ...state.queuedVideos], isLoading: false }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to add video to queue', isLoading: false });
    }
  },

  fetchQueuedVideos: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await videoAPI.getQueuedVideos();
      set({ queuedVideos: response.videos, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch queued videos', isLoading: false });
    }
  },

  removeFromQueue: async (queueId: string) => {
    try {
      set({ isLoading: true, error: null });
      await videoAPI.removeFromQueue(queueId);
      set((state) => ({ queuedVideos: state.queuedVideos.filter((v) => v.id !== queueId), isLoading: false }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to remove from queue', isLoading: false });
    }
  },

  deleteVideo: async (videoId: string) => {
    try {
      set({ isLoading: true, error: null });
      await videoAPI.deleteVideo(videoId);
      set((state) => ({
        videos: state.videos.filter((v) => v.id !== videoId),
        currentVideo: state.currentVideo?.id === videoId ? null : state.currentVideo,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete video', isLoading: false });
    }
  },

  generateAvatarVideo: async (request: AvatarGenerateRequest) => {
    try {
      set({ isGenerating: true, error: null, avatarStatus: 'processing', avatarProgress: 0 });
      
      const response = await avatarAPI.generate(request);
      
      const newVideo: Video = {
        id: response.videoId,
        title: response.content.title,
        caption: 'Avatar Video',
        hashtags: [],
        niche: 'avatar-video',
        duration: 30,
        visualStyle: 'avatar',
        status: 'generating',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videoUrl: undefined,
        thumbnailUrl: undefined,
      };
      
      set((state) => ({ 
        videos: [newVideo, ...state.videos], 
        isGenerating: false,
        avatarStatus: 'processing'
      }));
      
      return response.videoId;
    } catch (error: any) {
      set({ 
        error: error.message || 'Avatar video generation failed', 
        isGenerating: false,
        avatarStatus: 'error'
      });
      throw error;
    }
  },

  pollAvatarStatus: async (requestId: string, onComplete: (videoUrl: string) => void) => {
    const maxAttempts = 120; // 20 minutes max
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await avatarAPI.getStatus(requestId);
        
        if (response.status === 'success' || response.videoStatus === 'completed') {
          set({ avatarStatus: 'success', avatarProgress: 100 });
          
          // Get the result to get video URL
          const result = await avatarAPI.getResult(requestId);
          if (result.videos && result.videos.length > 0) {
            onComplete(result.videos[0].url);
          }
          return;
        }
        
        if (response.status === 'error' || response.status === 'failed') {
          set({ avatarStatus: 'error', error: response.error || 'Avatar generation failed' });
          return;
        }
        
        // Update progress (approx 5-10 seconds per attempt)
        const progress = Math.min(90, (attempts / maxAttempts) * 100);
        set({ avatarProgress: progress });
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10 seconds
        attempts++;
      } catch (error: any) {
        console.error('Avatar status poll error:', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;
      }
    }
    
    set({ avatarStatus: 'error', error: 'Avatar generation timed out' });
  },

  clearError: () => set({ error: null, avatarStatus: 'idle' }),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  resetAvatarStatus: () => set({ avatarStatus: 'idle', avatarProgress: 0 }),
}));
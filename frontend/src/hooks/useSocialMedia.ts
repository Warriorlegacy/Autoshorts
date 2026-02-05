import { useState, useCallback } from 'react';
import { socialAPI, youtubeAPI, SocialAccount } from '../api/videos';

interface UseSocialMediaReturn {
  accounts: SocialAccount[];
  loading: boolean;
  error: string | null;
  refreshAccounts: () => Promise<void>;
  connectYouTube: () => Promise<void>;
  disconnectPlatform: (platform: 'youtube' | 'instagram') => Promise<boolean>;
  postVideo: (request: {
    videoPath: string;
    title: string;
    description: string;
    hashtags: string[];
    platforms: ('youtube' | 'instagram')[];
  }) => Promise<{ success: boolean; results: any[] }>;
  getUploadHistory: (limit?: number) => Promise<any[]>;
}

export function useSocialMedia(): UseSocialMediaReturn {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    try {
      const response = await socialAPI.getConnectedAccounts();
      setAccounts(response.accounts);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const connectYouTube = useCallback(async () => {
    try {
      setLoading(true);
      const response = await youtubeAPI.getAuthUrl();

      if (response.authUrl) {
        window.open(response.authUrl, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectPlatform = useCallback(async (platform: 'youtube' | 'instagram') => {
    try {
      setLoading(true);
      const response = await socialAPI.disconnectPlatform(platform);
      await refreshAccounts();
      return response.success;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshAccounts]);

  const postVideo = useCallback(async (request: {
    videoPath: string;
    title: string;
    description: string;
    hashtags: string[];
    platforms: ('youtube' | 'instagram')[];
  }) => {
    try {
      setLoading(true);
      const response = await socialAPI.postVideo(request);
      return { success: response.success, results: response.results };
    } catch (err: any) {
      setError(err.message);
      return { success: false, results: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUploadHistory = useCallback(async (limit = 20) => {
    try {
      const response = await socialAPI.getUploadHistory(limit);
      return response.history;
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, []);

  return {
    accounts,
    loading,
    error,
    refreshAccounts,
    connectYouTube,
    disconnectPlatform,
    postVideo,
    getUploadHistory,
  };
}

export default useSocialMedia;

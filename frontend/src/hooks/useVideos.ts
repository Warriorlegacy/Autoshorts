import { useEffect } from 'react';
import { useVideoStore } from '../store/videoStore';

export const useVideos = () => {
  const { 
    videos, 
    currentVideo, 
    isGenerating, 
    isLoading, 
    error, 
    generateVideo, 
    fetchVideos, 
    fetchVideo, 
    deleteVideo, 
    clearError, 
    setCurrentVideo 
  } = useVideoStore();

  useEffect(() => {
    // Fetch videos on component mount if not loaded
    if (videos.length === 0 && !isLoading) {
      fetchVideos();
    }
  }, []);

  return {
    videos,
    currentVideo,
    isGenerating,
    isLoading,
    error,
    generateVideo,
    fetchVideos,
    fetchVideo,
    deleteVideo,
    clearError,
    setCurrentVideo,
  };
};
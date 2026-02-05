import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useVideoStore } from '../../store/videoStore';

const VideoReview = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const { currentVideo, fetchVideo, regenerateVideo, addToQueue, isGenerating, error } = useVideoStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isEditing, setIsEditing] = useState({
    title: false,
    caption: false
  });

  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().split('T')[0]);

  const [videoData, setVideoData] = useState({
    title: '',
    caption: '',
    hashtags: [] as string[],
    duration: 0,
    generatedAt: ''
  });

  useEffect(() => {
    if (videoId) {
      fetchVideo(videoId);
    }
  }, [videoId, fetchVideo]);

  useEffect(() => {
    if (currentVideo) {
      setVideoData({
        title: currentVideo.title,
        caption: currentVideo.caption || '',
        hashtags: currentVideo.hashtags || [],
        duration: currentVideo.duration || 0,
        generatedAt: new Date(currentVideo.createdAt || '').toLocaleString()
      });
    }
  }, [currentVideo]);

  const handleRegenerate = async () => {
    if (!videoId) return;
    
    if (confirm('Regenerate this video? This will create a new version with the same settings.')) {
      try {
        await regenerateVideo(videoId);
        alert('Video regeneration started. It will be available shortly.');
        // Refresh to show new video
        setTimeout(() => fetchVideo(videoId), 2000);
      } catch (err) {
        alert('Failed to regenerate video: ' + error);
      }
    }
  };

  const handleAddToQueue = async () => {
    if (!videoId || selectedPlatforms.length === 0) {
      alert('Please select at least one platform and a scheduled date.');
      return;
    }

    try {
      await addToQueue(videoId, selectedPlatforms, scheduledAt);
      alert(`Video scheduled for ${selectedPlatforms.join(', ')} on ${scheduledAt}`);
      setShowQueueModal(false);
      setSelectedPlatforms([]);
    } catch (err) {
      alert('Failed to add to queue: ' + error);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-8">Review Your Video</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Video Player */}
        <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="aspect-[9/16] bg-black relative">
            {currentVideo?.videoUrl ? (
              <video
                ref={videoRef}
                src={currentVideo.videoUrl.startsWith('http') 
                  ? currentVideo.videoUrl 
                  : `http://localhost:3001${currentVideo.videoUrl}`}
                className="w-full h-full object-contain"
                controls
                playsInline
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                    </svg>
                  </div>
                  <p className="text-sm opacity-75">
                    {currentVideo?.status === 'generating' ? 'Video is rendering...' : 'Video not available'}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Generated {videoData.generatedAt}</span>
              {currentVideo?.videoUrl && (
                <button 
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.requestFullscreen) {
                        videoRef.current.requestFullscreen();
                      }
                    }
                  }}
                  className="text-primary-blue text-sm font-medium hover:underline"
                >
                  View Full Screen
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Metadata Editor */}
        <motion.div className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-medium">Title</label>
              <button
                onClick={() => setIsEditing({ ...isEditing, title: !isEditing.title })}
                className="text-primary-blue text-sm font-medium hover:underline"
              >
                {isEditing.title ? 'Save' : 'Edit'}
              </button>
            </div>
            {isEditing.title ? (
              <input
                type="text"
                value={videoData.title}
                onChange={(e) => setVideoData({ ...videoData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-blue focus:outline-none"
                maxLength={100}
              />
            ) : (
              <p className="text-lg font-medium">{videoData.title}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              {videoData.title.length}/100 characters
            </div>
          </div>

          {/* Caption */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-medium">Caption</label>
              <button
                onClick={() => setIsEditing({ ...isEditing, caption: !isEditing.caption })}
                className="text-primary-blue text-sm font-medium hover:underline"
              >
                {isEditing.caption ? 'Save' : 'Edit'}
              </button>
            </div>
            {isEditing.caption ? (
              <textarea
                value={videoData.caption}
                onChange={(e) => setVideoData({ ...videoData, caption: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-primary-blue focus:outline-none h-24 resize-none"
                maxLength={2200}
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{videoData.caption}</p>
            )}
            <div className="mt-2 text-xs text-gray-500">
              {videoData.caption.length}/2200 characters
            </div>
          </div>

          {/* Hashtags */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-medium">Hashtags</label>
              <button className="text-primary-blue text-sm font-medium hover:underline">
                Suggest more
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {videoData.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary-blue/10 text-primary-blue rounded-full text-sm font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Status Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <motion.button
              onClick={handleRegenerate}
              disabled={isGenerating}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 rounded-full border-2 border-primary-blue text-primary-blue font-semibold hover:bg-primary-blue/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </motion.button>
            <motion.button
              onClick={() => setShowQueueModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-3 rounded-full bg-primary-blue text-white font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Add to Queue
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Queue Modal */}
      {showQueueModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold mb-6">Schedule Video</h2>

            {/* Platform Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Select Platforms</label>
              <div className="space-y-2">
                {['YouTube', 'Instagram', 'TikTok'].map(platform => (
                  <label key={platform} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(platform.toLowerCase())}
                      onChange={() => togglePlatform(platform.toLowerCase())}
                      className="mr-3 w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-gray-700">{platform}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule Date */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Schedule Date</label>
              <input
                type="date"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-primary-blue focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowQueueModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToQueue}
                className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg font-medium hover:bg-blue-600 transition"
              >
                Schedule
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default VideoReview;

import { useEffect, useState } from 'react';
import { Calendar, Trash2, CheckCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVideoStore } from '../../store/videoStore';

export default function Queue() {
  const { queuedVideos, fetchQueuedVideos, removeFromQueue, isLoading, error } = useVideoStore();
  const [localError, setLocalError] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQueuedVideos().catch(err => {
      setLocalError('Failed to load queued videos');
      console.error(err);
    });
  }, [fetchQueuedVideos]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Calendar className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'processing':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const handleRemoveFromQueue = async (queueId: string) => {
    if (confirm('Remove this video from the queue?')) {
      try {
        await removeFromQueue(queueId);
      } catch (err) {
        setLocalError('Failed to remove video from queue');
      }
    }
  };

  const handlePostNow = async (queueId: string) => {
    if (confirm('Post this video now to all connected platforms?')) {
      setPostingId(queueId);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/videos/${queueId}/post-now`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.success) {
          alert('Video posted successfully!');
          fetchQueuedVideos();
        } else {
          setLocalError(data.message || 'Failed to post video');
        }
      } catch (err) {
        setLocalError('Failed to post video');
      } finally {
        setPostingId(null);
      }
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Queue</h1>
            <p className="text-gray-600">Manage and schedule your video posts</p>
          </div>
          <Link
            to="/create"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Create & Schedule
          </Link>
        </div>

        {displayError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{displayError}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        ) : (!queuedVideos || queuedVideos.length === 0) ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No scheduled videos yet</p>
            <Link
              to="/create"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Create Video
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {queuedVideos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(video.status)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                        <span>
                          📅 {new Date(video.scheduledAt).toLocaleString()}
                        </span>
                        <span>
                          📱 {video.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${getStatusColor(
                        video.status
                      )}`}
                    >
                      {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                    </span>
                    {video.status === 'queued' && (
                      <>
                        <button
                          onClick={() => handlePostNow(video.id)}
                          disabled={postingId === video.id}
                          className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm disabled:opacity-50"
                          title="Post now"
                        >
                          {postingId === video.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          Post Now
                        </button>
                        <button
                          onClick={() => handleRemoveFromQueue(video.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {video.status === 'failed' && (
                      <button
                        onClick={() => handleRemoveFromQueue(video.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Remove failed item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

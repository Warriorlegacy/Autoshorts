import { useEffect, useState } from 'react';
import { Film, Trash2, Eye, Download, ExternalLink, Copy, Check } from 'lucide-react';
import { useVideos } from '../../hooks/useVideos';
import { Link } from 'react-router-dom';
import type { Video } from '../../api/videos';

export default function Library() {
  const { videos, isLoading, fetchVideos, deleteVideo } = useVideos();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'generating':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDate = (video: Video) => {
    return new Date(video.createdAt).toLocaleDateString();
  };

  const getThumbnail = (video: Video) => {
    return video.thumbnailUrl;
  };

  const handleCopyUrl = async (url: string, videoId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(videoId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = (videoUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Video Library</h1>
          <p className="text-gray-600">All your generated videos in one place</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin">
              <Film className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Film className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No videos yet. Create your first video!</p>
            <Link
              to="/create"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Create Video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden">
                {getThumbnail(video) ? (
                  <img
                    src={getThumbnail(video)}
                    alt={video.title}
                    className="w-full h-40 object-cover bg-gray-200"
                  />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white" />
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">{video.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{video.caption}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(
                        video.status
                      )}`}
                    >
                      {video.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {getDate(video)}
                    </span>
                  </div>

                  {video.videoUrl && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs break-all">
                      <span className="text-gray-500">URL: </span>
                      <span className="text-blue-600">{video.videoUrl.substring(0, 50)}...</span>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Link
                      to={`/review/${video.id}`}
                      className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                    {video.videoUrl && (
                      <>
                        <button
                          onClick={() => handleCopyUrl(video.videoUrl!, video.id)}
                          className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                          title="Copy video URL"
                        >
                          {copiedId === video.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                          {copiedId === video.id ? 'Copied!' : 'Copy'}
                        </button>
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                          title="Open video"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </a>
                        <button
                          onClick={() => handleDownload(video.videoUrl!, video.title)}
                          className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm"
                          title="Download video"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Delete this video?')) {
                          deleteVideo(video.id);
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
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

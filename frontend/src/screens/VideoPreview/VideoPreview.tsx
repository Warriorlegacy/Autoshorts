import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ShortVideo } from '../../components/ShortVideo';
import { VideoPreview } from '../../api/videos';

const VideoPreviewScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const previewData = location.state?.previewData as VideoPreview;
  const [preview, setPreview] = useState<VideoPreview | null>(null);

  useEffect(() => {
    if (previewData) {
      setPreview(previewData);
    } else {
      navigate('/');
    }
  }, [previewData, navigate]);

  if (!preview) return <div>Loading preview...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Preview: {preview.title}</h2>
      <p className="mb-2 text-gray-600">{preview.caption}</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {preview.hashtags.map((tag, index) => (
          <span key={index} className="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
            #{tag}
          </span>
        ))}
      </div>
      
      {/* Remotion Player */}
      <div className="flex justify-center">
        <Player
          component={ShortVideo}
          durationInFrames={preview.duration * 30} // assuming 30 fps
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          controls
          inputProps={{
            scenes: preview.scenes,
            totalDuration: preview.duration,
          }}
          style={{ width: '100%', maxWidth: '540px', margin: '0 auto' }}
        />
      </div>
      
      <div className="mt-6 text-center">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-primary-blue text-white rounded-full font-semibold hover:bg-blue-600 transition-colors"
        >
          ← Back to Editor
        </button>
      </div>
    </div>
  );
};

export default VideoPreviewScreen;

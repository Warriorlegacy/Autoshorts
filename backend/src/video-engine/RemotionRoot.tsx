import { Composition } from 'remotion';
import { ShortVideo, VideoScene } from './ShortVideo';

interface RemotionRootProps {
  scenes?: VideoScene[];
  totalDuration?: number;
}

export const RemotionRoot: React.FC<RemotionRootProps> = ({ 
  scenes: initialScenes,
  totalDuration: initialDuration 
}) => {
  // Default composition for preview
  const defaultScenes: VideoScene[] = initialScenes || [
    {
      id: '1',
      narration: 'Welcome to AutoShorts!',
      textOverlay: 'AI Video Generator',
      duration: 15,
      background: {
        type: 'gradient',
        source: 'linear-gradient(135deg, #0010FF 0%, #7C3AED 100%)',
      },
    },
    {
      id: '2',
      narration: 'Create amazing short videos with AI',
      textOverlay: 'Easy & Fast',
      duration: 15,
      background: {
        type: 'gradient',
        source: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
      },
    },
  ];

  const totalDuration = initialDuration || 60;

  return (
    <>
      <Composition
        id="ShortVideo"
        component={ShortVideo}
        durationInFrames={Math.round(totalDuration * 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes: defaultScenes,
          totalDuration,
        }}
      />
    </>
  );
};
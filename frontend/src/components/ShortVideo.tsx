import { AbsoluteFill, Sequence, Audio, useVideoConfig, Img } from 'remotion';
import React from 'react';

export interface VideoScene {
  id: string;
  narration: string;
  textOverlay: string;
  duration: number;
  background: {
    type: 'image' | 'video' | 'gradient' | 'color';
    source: string;
  };
  audioUrl?: string;
}

interface ShortVideoProps {
  scenes?: VideoScene[];
  totalDuration?: number;
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number;
}

export const ShortVideo: React.FC<ShortVideoProps> = (props) => {
  const { scenes, totalDuration = 60, backgroundMusicUrl, backgroundMusicVolume = 0.3 } = props;
  const { fps } = useVideoConfig();

  const sceneFrames = React.useMemo(() => {
    if (!scenes || scenes.length === 0) return [];
    const totalDurationFrames = Math.round(totalDuration * fps);
    const baseDurationPerScene = totalDurationFrames / scenes.length;
    const hasExplicit = scenes.some(s => s.duration && s.duration > 0);
    if (hasExplicit) {
      const sum = scenes.reduce((a, s) => a + (s.duration || 5), 0);
      if (sum <= 0) return scenes.map(() => Math.round(baseDurationPerScene));
      const factor = totalDurationFrames / (sum * fps);
      return scenes.map(s => Math.max(1, Math.round(((s.duration || 5) * fps) * factor)));
    }
    return scenes.map(() => Math.round(baseDurationPerScene));
  }, [scenes, totalDuration, fps]);

  if (!scenes || scenes.length === 0) {
    return <AbsoluteFill style={{ backgroundColor: '#000', color: '#fff' }} />;
  }

  let current = 0;
  const startFrames = sceneFrames.map(d => {
    const s = current; current += d; return s;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {backgroundMusicUrl && <Audio src={backgroundMusicUrl} volume={backgroundMusicVolume} loop />}
      {scenes.map((scene, i) => (
        <Sequence key={scene.id} from={startFrames[i]} durationInFrames={sceneFrames[i]}>
          {/* Scene rendering with image support */}
          <AbsoluteFill>
            {scene.background.type === 'image' ? (
              <Img 
                src={scene.background.source} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : scene.background.type === 'gradient' ? (
              <div style={{ width: '100%', height: '100%', background: scene.background.source }} />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: scene.background.source }} />
            )}
            {scene.audioUrl && <Audio src={scene.audioUrl} volume={1} />}
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              padding: '40px',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              pointerEvents: 'none'
            }}>
              <h2 style={{ 
                fontSize: '3rem', 
                fontWeight: 'bold', 
                marginBottom: '20px',
                maxWidth: '90%'
              }}>
                {scene.textOverlay}
              </h2>
              <p style={{ 
                fontSize: '1.5rem', 
                maxWidth: '80%',
                lineHeight: '1.4'
              }}>
                {scene.narration}
              </p>
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
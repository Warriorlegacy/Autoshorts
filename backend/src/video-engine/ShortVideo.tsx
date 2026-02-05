import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Sequence,
  spring,
  Audio,
  staticFile,
} from 'remotion';
import {
  TransitionSeries,
  linearTiming,
  springTiming,
} from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { flip } from '@remotion/transitions/flip';

export interface VideoScene {
  id: string;
  narration: string;
  textOverlay: string;
  duration: number; // in seconds
  background: {
    type: 'image' | 'video' | 'gradient' | 'color';
    source: string;
  };
  audioUrl?: string; // Optional audio for this scene
}

interface ShortVideoProps {
  scenes?: VideoScene[];
  totalDuration?: number;
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number;
  transitionType?: 'fade' | 'slide' | 'wipe' | 'flip' | 'random';
}

/**
 * Premium animated text component with entrance and exit animations
 */
const AnimatedText: React.FC<{
  text: string;
  subtitle?: string;
  frameInScene: number;
  durationFrames: number;
  fps: number;
}> = ({ text, subtitle, frameInScene, durationFrames, fps }) => {
  // Entrance animation - spring-based for premium feel
  const entranceSpring = spring({
    frame: frameInScene,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
      mass: 1,
    },
  });

  // Text scale animation
  const scale = interpolate(
    entranceSpring,
    [0, 1],
    [0.8, 1],
    { extrapolateRight: 'clamp' }
  );

  // Text opacity animation
  const opacity = interpolate(
    entranceSpring,
    [0, 0.5, 1],
    [0, 0.8, 1],
    { extrapolateRight: 'clamp' }
  );

  // Y position animation
  const y = interpolate(
    entranceSpring,
    [0, 1],
    [50, 0],
    { extrapolateRight: 'clamp' }
  );

  // Exit animation - starts at 80% of scene duration
  const exitStart = durationFrames * 0.8;
  const exitProgress = frameInScene > exitStart
    ? (frameInScene - exitStart) / (durationFrames - exitStart)
    : 0;

  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const exitY = interpolate(exitProgress, [0, 1], [0, -30]);

  const finalOpacity = Math.min(opacity, exitOpacity);
  const finalY = y + exitY;

  return (
    <div
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 40px',
        textAlign: 'center',
        color: 'white',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        opacity: finalOpacity,
        transform: `translateY(${finalY}px) scale(${scale})`,
      }}
    >
      {/* Main Title with text shadow for depth */}
      <h1
        style={{
          fontSize: '56px',
          fontWeight: 800,
          margin: '0 0 20px 0',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
          textShadow: '0 4px 20px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',
          background: 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {text}
      </h1>

      {/* Subtitle/Narration */}
      {subtitle && (
        <p
          style={{
            fontSize: '28px',
            fontWeight: 500,
            margin: '20px 0 0 0',
            lineHeight: '1.5',
            opacity: 0.95,
            maxWidth: '85%',
            textShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

/**
 * Background component with Ken Burns effect for images
 */
const AnimatedBackground: React.FC<{
  background: VideoScene['background'];
  frameInScene: number;
  durationFrames: number;
}> = ({ background, frameInScene, durationFrames }) => {
  const { width, height } = useVideoConfig();

  // Ken Burns effect for images
  const kenBurnsProgress = frameInScene / durationFrames;
  const scale = 1 + (kenBurnsProgress * 0.1); // Zoom from 1.0 to 1.1
  const translateX = kenBurnsProgress * 20; // Pan slightly

  const getBackgroundStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      top: 0,
      left: 0,
      transition: 'none',
    };

    switch (background.type) {
      case 'gradient':
        return {
          ...baseStyle,
          background: background.source,
        };
      case 'color':
        return {
          ...baseStyle,
          backgroundColor: background.source,
        };
      case 'image':
        return {
          ...baseStyle,
          backgroundImage: `url(${background.source})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(${scale}) translateX(${-translateX}px)`,
          transition: 'transform 0.1s linear',
        };
      default:
        return { ...baseStyle, backgroundColor: '#0f0c29' };
    }
  };

  return (
    <>
      <div style={getBackgroundStyle()} />
      {/* Gradient overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
};

/**
 * Individual scene component with premium animations
 */
const SceneComponent: React.FC<{
  scene: VideoScene;
  sceneIndex: number;
  totalScenes: number;
  durationFrames: number;
}> = ({ scene, sceneIndex, totalScenes, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frameInScene = frame; // In TransitionSeries, frame is relative to the sequence

  return (
    <AbsoluteFill>
      {/* Background audio for this scene */}
      {scene.audioUrl && (
        <Audio
          src={scene.audioUrl}
          startFrom={0}
          endAt={durationFrames}
          volume={1}
        />
      )}

      <AnimatedBackground
        background={scene.background}
        frameInScene={frameInScene}
        durationFrames={durationFrames}
      />

      <AnimatedText
        text={scene.textOverlay}
        subtitle={scene.narration}
        frameInScene={frameInScene}
        durationFrames={durationFrames}
        fps={fps}
      />

      {/* Scene progress indicator */}
      {totalScenes > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
          }}
        >
          {Array.from({ length: totalScenes }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === sceneIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: i === sceneIndex ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * Get random transition presentation
 */
const getRandomTransition = (width: number, height: number) => {
  const transitions = [
    fade(),
    slide({ direction: 'from-left' }),
    slide({ direction: 'from-right' }),
    slide({ direction: 'from-top' }),
    slide({ direction: 'from-bottom' }),
    wipe(),
    flip(),
  ];
  return transitions[Math.floor(Math.random() * transitions.length)];
};

/**
 * Main ShortVideo component - Premium version with transitions
 */
export const ShortVideo: React.FC<ShortVideoProps> = ({
  scenes,
  totalDuration = 60,
  transitionType = 'random',
}) => {
  const { fps, width, height } = useVideoConfig();

  // Calculate frame distribution across scenes
  const sceneFrames = useMemo(() => {
    if (!scenes || scenes.length === 0) {
      return [];
    }

    const totalDurationFrames = Math.round(totalDuration * fps);

    // Use explicit scene durations if available
    const hasExplicitDurations = scenes.some((s: VideoScene) => s.duration && s.duration > 0);

    if (hasExplicitDurations) {
      const sumDurations = scenes.reduce((sum: number, s: VideoScene) => sum + (s.duration || 5), 0);
      const scaleFactor = totalDurationFrames / (sumDurations * fps);

      return scenes.map((scene: VideoScene) => {
        const frameDuration = (scene.duration || 5) * fps * scaleFactor;
        return Math.max(30, Math.round(frameDuration)); // Minimum 1 second
      });
    }

    // Distribute evenly
    const baseDurationPerScene = Math.round(totalDurationFrames / scenes.length);
    return scenes.map(() => baseDurationPerScene);
  }, [scenes, totalDuration, fps]);

  if (!scenes || scenes.length === 0) {
    return (
      <AbsoluteFill style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>No scenes to render</h1>
          <p style={{ fontSize: '24px', opacity: 0.7 }}>Please provide video scenes</p>
        </div>
      </AbsoluteFill>
    );
  }

  // Transition configuration
  const transitionDuration = Math.round(fps * 0.5); // 0.5 second transitions

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <TransitionSeries>
        {scenes.map((scene: VideoScene, index: number) => (
          <React.Fragment key={scene.id}>
            <TransitionSeries.Sequence durationInFrames={sceneFrames[index]}>
              <SceneComponent
                scene={scene}
                sceneIndex={index}
                totalScenes={scenes.length}
                durationFrames={sceneFrames[index]}
              />
            </TransitionSeries.Sequence>

            {/* Add transition between scenes (except after last scene) */}
            {index < scenes.length - 1 && (
              <TransitionSeries.Transition
                timing={springTiming({
                  config: { damping: 20, stiffness: 120 },
                })}
                presentation={(
                  transitionType === 'random'
                    ? getRandomTransition(width, height)
                    : transitionType === 'fade'
                    ? fade()
                    : transitionType === 'slide'
                    ? slide()
                    : transitionType === 'wipe'
                    ? wipe()
                    : transitionType === 'flip'
                    ? flip()
                    : fade()
                ) as any}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export default ShortVideo;

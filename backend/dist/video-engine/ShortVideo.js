"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortVideo = void 0;
const react_1 = __importDefault(require("react"));
const remotion_1 = require("remotion");
const ShortVideo = ({ scenes }) => {
    const frame = (0, remotion_1.useCurrentFrame)();
    const { fps } = (0, remotion_1.useVideoConfig)();
    // Basic logic to show scenes sequentially
    // For now, just show the first scene
    const scene = scenes[0];
    const opacity = (0, remotion_1.spring)({
        frame,
        fps,
        config: { damping: 200 },
    });
    return (<remotion_1.AbsoluteFill style={{
            backgroundColor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
      <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: scene.background.type === 'gradient' ? scene.background.source : 'black'
        }}/>
      
      <div style={{ opacity, zIndex: 1, textAlign: 'center' }}>
        <h1 style={{ fontSize: '100px', fontWeight: 'bold' }}>{scene.textOverlay}</h1>
        <p style={{ fontSize: '50px' }}>{scene.narration}</p>
      </div>
    </remotion_1.AbsoluteFill>);
};
exports.ShortVideo = ShortVideo;
//# sourceMappingURL=ShortVideo.js.map
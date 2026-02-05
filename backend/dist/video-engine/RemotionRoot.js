"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemotionRoot = void 0;
const remotion_1 = require("remotion");
const ShortVideo_1 = require("./ShortVideo");
const RemotionRoot = () => {
    return (<>
      <remotion_1.Composition id="ShortVideo" component={ShortVideo_1.ShortVideo} durationInFrames={1800} // 60 seconds at 30fps
     fps={30} width={1080} height={1920} defaultProps={{
            scenes: [
                {
                    id: '1',
                    narration: 'Welcome to AutoShorts!',
                    textOverlay: 'AI Video Generator',
                    background: { type: 'gradient', source: 'linear-gradient(to right, #0010FF, #7C3AED)' }
                }
            ]
        }}/>
    </>);
};
exports.RemotionRoot = RemotionRoot;
//# sourceMappingURL=RemotionRoot.js.map
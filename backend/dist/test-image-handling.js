"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ollamaCloudService_1 = require("./services/ollamaCloudService");
// Test the image handling functionality
const testImageHandling = async () => {
    const service = new ollamaCloudService_1.OllamaCloudService();
    // Test with mock images (Base64 strings)
    const mockImages = [
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAH4gLSz6qhwQAAAABJRU5ErkJggg==', // 1x1 red pixel
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAH4gLSz6qhwQAAAABJRU5ErkJggg==' // Same pixel
    ];
    try {
        const result = await service.generateVideoFromText({
            prompt: 'Create a video about technology with images',
            images: mockImages,
            duration: 30,
            style: 'modern'
        });
        console.log('Test result:', result);
        console.log('Number of scenes:', result.scenes.length);
        // Check if images were assigned to scenes
        result.scenes.forEach((scene, index) => {
            console.log(`Scene ${index + 1} background type:`, scene.background.type);
            if (scene.background.type === 'image') {
                console.log(`Scene ${index + 1} image source:`, scene.background.source.substring(0, 50) + '...');
            }
        });
    }
    catch (error) {
        console.error('Test failed:', error);
    }
};
// Run the test
testImageHandling();
//# sourceMappingURL=test-image-handling.js.map
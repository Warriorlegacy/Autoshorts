"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bytezVideoService_1 = require("./services/bytezVideoService");
const falVideoService_1 = require("./services/falVideoService");
const replicateVideoService_1 = require("./services/replicateVideoService");
const bytezVideoService_2 = require("./services/bytezVideoService");
const falVideoService_2 = require("./services/falVideoService");
const replicateVideoService_2 = require("./services/replicateVideoService");
const TEST_PROMPTS = [
    'A cat walking through a garden with butterflies',
    'Sunset over mountains with clouds moving',
    'A robot walking in a futuristic city',
    'Ocean waves crashing on a beach',
    'A person dancing in a dark room with neon lights',
];
const DELAY = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function testBytezVideo() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING BYTEZ VIDEO SERVICE');
    console.log('='.repeat(60));
    const service = (0, bytezVideoService_1.getBytezVideoService)();
    console.log(`Available: ${service.isAvailable() ? '✅' : '❌'}`);
    if (!service.isAvailable()) {
        console.log('⚠️  Bytez API key not configured. Skipping tests.');
        return null;
    }
    const results = [];
    for (const prompt of TEST_PROMPTS.slice(0, 2)) {
        console.log(`\n🎬 Testing ModelScope: "${prompt.substring(0, 40)}..."`);
        try {
            const result = await service.generateVideo({
                prompt,
                model: bytezVideoService_2.BYTEZ_VIDEO_MODELS.DEFAULT,
                width: 576,
                height: 320,
            });
            console.log(`   Status: ${result.status}`);
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Video URL: ${result.videoUrl || 'N/A'}`);
            console.log(`   Error: ${result.error || 'None'}`);
            results.push({
                model: 'ModelScope',
                prompt,
                ...result,
            });
            await DELAY(2000);
        }
        catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            results.push({ model: 'ModelScope', prompt, error: error.message });
        }
    }
    console.log('\n🎬 Testing ZeroScope...');
    const zeroScopePrompt = 'A quick animation of a bouncing ball';
    try {
        const result = await service.generateVideo({
            prompt: zeroScopePrompt,
            model: bytezVideoService_2.BYTEZ_VIDEO_MODELS.ZEROSCOPE,
        });
        console.log(`   Status: ${result.status}`);
        console.log(`   Request ID: ${result.requestId}`);
        console.log(`   Video URL: ${result.videoUrl || 'N/A'}`);
        results.push({
            model: 'ZeroScope',
            prompt: zeroScopePrompt,
            ...result,
        });
    }
    catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.push({ model: 'ZeroScope', prompt: zeroScopePrompt, error: error.message });
    }
    return results;
}
async function testFalVideo() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING FAL AI VIDEO SERVICE (LTX Video)');
    console.log('='.repeat(60));
    const service = (0, falVideoService_1.getFalVideoService)();
    console.log(`Available: ${service.isAvailable() ? '✅' : '❌'}`);
    if (!service.isAvailable()) {
        console.log('⚠️  FAL API key not configured. Skipping tests.');
        console.log('   To configure: Set FAL_API_KEY in .env');
        return null;
    }
    const results = [];
    for (const prompt of TEST_PROMPTS.slice(0, 2)) {
        console.log(`\n🎬 Testing LTX Video: "${prompt.substring(0, 40)}..."`);
        try {
            const result = await service.generateVideo({
                prompt,
                model: falVideoService_2.FAL_VIDEO_MODELS.DEFAULT,
                duration: 5,
                width: 768,
                height: 512,
                fps: 24,
            });
            console.log(`   Status: ${result.status}`);
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Video URL: ${result.videoUrl || 'N/A'}`);
            console.log(`   Error: ${result.error || 'None'}`);
            results.push({
                model: 'LTX Video',
                prompt,
                ...result,
            });
            await DELAY(3000);
        }
        catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            results.push({ model: 'LTX Video', prompt, error: error.message });
        }
    }
    return results;
}
async function testReplicateVideo() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING REPLICATE VIDEO SERVICE (CogVideo)');
    console.log('='.repeat(60));
    const service = (0, replicateVideoService_1.getReplicateVideoService)();
    console.log(`Available: ${service.isAvailable() ? '✅' : '❌'}`);
    if (!service.isAvailable()) {
        console.log('⚠️  Replicate API key not configured. Skipping tests.');
        console.log('   To configure: Set REPLICATE_API_KEY in .env');
        return null;
    }
    const results = [];
    for (const prompt of TEST_PROMPTS.slice(0, 2)) {
        console.log(`\n🎬 Testing CogVideo: "${prompt.substring(0, 40)}..."`);
        try {
            const result = await service.generateVideo({
                prompt,
                model: replicateVideoService_2.REPLICATE_VIDEO_MODELS.DEFAULT,
                numFrames: 32,
                fps: 8,
                width: 480,
                height: 272,
            });
            console.log(`   Status: ${result.status}`);
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Video URL: ${result.videoUrl || 'N/A'}`);
            console.log(`   Error: ${result.error || 'None'}`);
            results.push({
                model: 'CogVideo',
                prompt,
                ...result,
            });
            await DELAY(5000);
        }
        catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            results.push({ model: 'CogVideo', prompt, error: error.message });
        }
    }
    return results;
}
async function runAllTests() {
    console.log('\n' + '🔥'.repeat(30));
    console.log('🎬 AUTO SHORTS - AI VIDEO SERVICES TEST');
    console.log('🔥'.repeat(30));
    const allResults = {};
    try {
        allResults.bytez = (await testBytezVideo()) || [];
    }
    catch (error) {
        console.error('Bytez test failed:', error.message);
    }
    try {
        allResults.fal = (await testFalVideo()) || [];
    }
    catch (error) {
        console.error('FAL test failed:', error.message);
    }
    try {
        allResults.replicate = (await testReplicateVideo()) || [];
    }
    catch (error) {
        console.error('Replicate test failed:', error.message);
    }
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    for (const [provider, results] of Object.entries(allResults)) {
        if (!results || results.length === 0)
            continue;
        const successCount = results.filter(r => r.status === 'success').length;
        const processingCount = results.filter(r => r.status === 'processing').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        console.log(`\n${provider.toUpperCase()}:`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ⏳ Processing: ${processingCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        results.forEach((r, i) => {
            const status = r.status === 'success' ? '✅' : r.status === 'processing' ? '⏳' : '❌';
            console.log(`   ${status} [${i + 1}] ${r.model}: ${r.prompt.substring(0, 30)}...`);
            if (r.error)
                console.log(`      Error: ${r.error}`);
            if (r.videoUrl)
                console.log(`      URL: ${r.videoUrl.substring(0, 80)}...`);
        });
    }
    console.log('\n' + '='.repeat(60));
    console.log('💡 USAGE INSTRUCTIONS');
    console.log('='.repeat(60));
    console.log(`
To generate AI videos via API:

POST /api/videos/ai-video/generate
{
  "prompt": "Your video description",
  "provider": "bytez" | "fal" | "replicate",
  "model": "optional model ID",
  "duration": 5,  // optional
  "width": 768,   // optional
  "height": 512   // optional
}

To check status:
GET /api/videos/ai-video/status/{requestId}?provider={provider}

Available providers:
- bytez: FREE (ModelScope, ZeroScope)
- fal: PAID ~$0.04/sec (LTX Video)
- replicate: PAID ~$0.0028/run (CogVideo)
`);
    console.log('✨ Test complete!\n');
}
runAllTests().catch(console.error);
//# sourceMappingURL=test-ai-video.js.map
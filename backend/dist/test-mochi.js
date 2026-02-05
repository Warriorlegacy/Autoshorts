"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const falVideoService_1 = require("./services/falVideoService");
const falVideoService_2 = require("./services/falVideoService");
const TEST_PROMPTS = [
    'A cat walking through a garden with butterflies',
    'Sunset over mountains with clouds moving',
    'A robot walking in a futuristic city',
];
const DELAY = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function testMochiVideo() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING MOCHI VIDEO (fal-ai/mochi-v1)');
    console.log('='.repeat(60));
    const service = (0, falVideoService_1.getFalVideoService)();
    console.log(`Available: ${service.isAvailable() ? '✅' : '❌'}`);
    if (!service.isAvailable()) {
        console.log('⚠️  FAL API key not configured. Skipping tests.');
        console.log('   To configure: Set FAL_API_KEY in .env');
        return;
    }
    const results = [];
    for (const prompt of TEST_PROMPTS.slice(0, 2)) {
        console.log(`\n🎬 Testing Mochi: "${prompt.substring(0, 40)}..."`);
        try {
            const result = await service.generateVideo({
                prompt,
                model: falVideoService_2.FAL_VIDEO_MODELS.MOCHI,
            });
            console.log(`   Status: ${result.status}`);
            console.log(`   Request ID: ${result.requestId}`);
            console.log(`   Video URL: ${result.videoUrl || 'N/A'}`);
            console.log(`   Error: ${result.error || 'None'}`);
            const typedResult = {
                model: 'Mochi 1',
                prompt,
                ...result,
            };
            results.push(typedResult);
            await DELAY(3000);
        }
        catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
            results.push({ model: 'Mochi 1', prompt, error: error.message });
        }
    }
    console.log('\n' + '='.repeat(60));
    console.log('📊 MOCHI TEST SUMMARY');
    console.log('='.repeat(60));
    const successCount = results.filter(r => r.status === 'success').length;
    const processingCount = results.filter(r => r.status === 'processing').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    console.log(`\n   ✅ Success: ${successCount}`);
    console.log(`   ⏳ Processing: ${processingCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    results.forEach((r, i) => {
        const status = r.status === 'success' ? '✅' : r.status === 'processing' ? '⏳' : '❌';
        console.log(`   ${status} [${i + 1}] ${r.prompt.substring(0, 30)}...`);
        if (r.error)
            console.log(`      Error: ${r.error}`);
        if (r.videoUrl)
            console.log(`      URL: ${r.videoUrl.substring(0, 80)}...`);
    });
    console.log('\n✨ Mochi test complete!\n');
}
testMochiVideo().catch(console.error);
//# sourceMappingURL=test-mochi.js.map
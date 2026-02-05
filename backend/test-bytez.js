const { getImageGenerationService } = require('./src/services/imageService');

async function test() {
  console.log('Testing Bytez...');
  const imageService = getImageGenerationService();
  const result = await imageService.generateImage({
    prompt: 'A beautiful sunset over mountains',
    provider: 'bytez',
    style: 'cinematic',
    aspectRatio: '9:16'
  });
  console.log(result ? '✅ Success: ' + result.imageUrl : '❌ Failed');
  process.exit(0);
}
test();

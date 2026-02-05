require('dotenv').config();
const { BytezVideoService } = require('./src/services/bytezVideoService');

async function test() {
  console.log('Testing Bytez Video Service...');
  
  const service = new BytezVideoService();
  console.log('Available:', service.isAvailable());
  
  const result = await service.generateVideo({
    prompt: 'A robot walking through a futuristic city',
    duration: 3
  });
  
  console.log('\nResult:', JSON.stringify(result, null, 2));
  
  if (result.status === 'success' && result.videoUrl) {
    console.log('\n✅ Video URL:', result.videoUrl);
  }
  
  process.exit(0);
}

test();

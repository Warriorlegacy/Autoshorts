/**
 * Test script for Pexels and Murf integrations
 * Run with: npx ts-node src/test-pexels-murf.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { getImageGenerationService } from './services/imageService';
import { getTTSService } from './services/ttsService';

const colors: Record<string, string> = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
};

async function testPexels() {
  console.log(`${colors.cyan}\n🧪 Testing Pexels (Stock Images)${colors.reset}\n`);

  try {
    const imageService = getImageGenerationService();
    
    const providers = imageService.getAvailableProviders();
    const pexelsProvider = providers.find(p => p.name === 'pexels');
    
    if (pexelsProvider) {
      log.info(`Pexels provider available: ${pexelsProvider.available ? 'Yes' : 'No'}`);
    }

    log.info('Searching for stock image: "sunset beach"...');
    const startTime = Date.now();

    const result = await imageService.generateImage({
      prompt: 'sunset beach',
      provider: 'pexels',
      style: 'stock',
      aspectRatio: '9:16',
    });

    const duration = Date.now() - startTime;

    if (result && result.imageUrl) {
      log.success(`Image found successfully in ${duration}ms`);
      log.info(`Provider: ${result.provider}`);
      log.info(`URL: ${result.imageUrl}`);
      return true;
    } else {
      log.error('Pexels returned no image');
      return false;
    }
  } catch (error: any) {
    log.error(`Pexels test failed: ${error.message}`);
    return false;
  }
}

async function testMurf() {
  console.log(`${colors.cyan}\n🧪 Testing Murf (TTS)${colors.reset}\n`);

  try {
    const ttsService = getTTSService();
    
    const testText = 'Hello! This is a test of the Murf text-to-speech service.';

    log.info('Generating audio with Murf...');
    const startTime = Date.now();

    const result = await ttsService.synthesize({
      text: testText,
      languageCode: 'en-US',
      ssmlGender: 'FEMALE',
      speakingRate: 1.0,
    });

    const duration = Date.now() - startTime;

    if (result && result.audioUrl && result.audioBuffer.length > 0) {
      log.success(`Audio generated successfully in ${duration}ms`);
      log.info(`Duration: ${result.duration}ms`);
      log.info(`File size: ${(result.audioBuffer.length / 1024).toFixed(2)} KB`);
      log.info(`URL: ${result.audioUrl}`);
      return true;
    } else {
      log.error('Murf returned no audio');
      return false;
    }
  } catch (error: any) {
    log.error(`Murf test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════╗
║     Pexels & Murf Integration Test                ║
╚═══════════════════════════════════════════════════╝${colors.reset}`);

  const pexelsResult = await testPexels();
  const murfResult = await testMurf();

  console.log(`${colors.cyan}\n═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`Pexels: ${pexelsResult ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
  console.log(`Murf:   ${murfResult ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);

  if (pexelsResult && murfResult) {
    console.log(`${colors.green}\n🎉 All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}\n⚠️ Some tests failed. Check your API keys.${colors.reset}`);
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

"use strict";
/**
 * Test script to verify all FREE services are working
 *
 * Run with: npx ts-node src/test-free-services.ts
 *
 * This script validates:
 * 1. Groq API connection (script generation)
 * 2. Edge TTS service (text-to-speech)
 * 3. Pollinations AI (image generation)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const scriptService_1 = require("./services/scriptService");
const ttsService_1 = require("./services/ttsService");
const imageService_1 = require("./services/imageService");
const config_1 = require("./constants/config");
// Color codes for output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};
const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    header: (msg) => console.log(`${colors.cyan}\n${msg}${colors.reset}`),
};
async function testGroqAPI() {
    log.header('🧪 Testing Groq API (Script Generation)');
    try {
        const groqService = new scriptService_1.ScriptService();
        log.info('Generating test script about "Technology"...');
        const startTime = Date.now();
        const script = await groqService.generateScript('Technology', 30);
        const duration = Date.now() - startTime;
        if (script && script.title && script.scenes && script.scenes.length > 0) {
            log.success(`Script generated successfully in ${duration}ms`);
            log.info(`Title: ${script.title}`);
            log.info(`Scenes: ${script.scenes.length}`);
            log.info(`Hashtags: ${script.hashtags?.length || 0}`);
            return true;
        }
        else {
            log.error('Script generation returned invalid data');
            return false;
        }
    }
    catch (error) {
        log.error(`Groq API test failed: ${error.message}`);
        return false;
    }
}
async function testEdgeTTS() {
    log.header('🧪 Testing Edge TTS (Text-to-Speech)');
    try {
        const ttsService = (0, ttsService_1.getTTSService)();
        const testText = 'Hello! This is a test of the free Microsoft Edge text-to-speech service.';
        log.info('Generating test audio...');
        const startTime = Date.now();
        const result = await ttsService.synthesize({
            text: testText,
            languageCode: 'en-US',
            voiceName: 'en-US-JennyNeural',
            speakingRate: 1.0,
        });
        const duration = Date.now() - startTime;
        if (result && result.audioUrl && result.audioBuffer.length > 0) {
            log.success(`Audio generated successfully in ${duration}ms`);
            log.info(`Duration: ${result.duration}ms`);
            log.info(`File size: ${(result.audioBuffer.length / 1024).toFixed(2)} KB`);
            log.info(`Audio URL: ${result.audioUrl}`);
            return true;
        }
        else {
            log.error('TTS generation returned invalid data');
            return false;
        }
    }
    catch (error) {
        log.error(`Edge TTS test failed: ${error.message}`);
        return false;
    }
}
async function testPollinationsAI() {
    log.header('🧪 Testing Pollinations AI (Image Generation)');
    try {
        const imageService = (0, imageService_1.getImageGenerationService)();
        log.info('Generating test image...');
        const startTime = Date.now();
        const result = await imageService.generateImage({
            prompt: 'A beautiful sunset over mountains, cinematic style',
            style: 'cinematic',
            aspectRatio: '9:16',
            quality: 'high',
        });
        const duration = Date.now() - startTime;
        if (result && result.imageUrl && result.localPath) {
            log.success(`Image generated successfully in ${duration}ms`);
            log.info(`Style: ${result.style}`);
            log.info(`Image URL: ${result.imageUrl}`);
            return true;
        }
        else {
            log.error('Image generation returned invalid data');
            return false;
        }
    }
    catch (error) {
        log.error(`Pollinations AI test failed: ${error.message}`);
        return false;
    }
}
async function testConfiguration() {
    log.header('🧪 Testing Configuration');
    try {
        log.info('Validating configuration...');
        config_1.CONFIG.validate();
        log.success('Configuration validated successfully');
        return true;
    }
    catch (error) {
        log.error(`Configuration test failed: ${error.message}`);
        return false;
    }
}
async function runAllTests() {
    console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║     AutoShorts FREE Services Integration Test              ║
║     Verify all free AI services are working correctly      ║
╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    const results = {
        config: false,
        groq: false,
        tts: false,
        images: false,
    };
    // Test 1: Configuration
    results.config = await testConfiguration();
    // Test 2: Groq API (Script Generation)
    if (results.config) {
        results.groq = await testGroqAPI();
    }
    else {
        log.warning('Skipping Groq test - configuration invalid');
    }
    // Test 3: Edge TTS
    results.tts = await testEdgeTTS();
    // Test 4: Pollinations AI
    results.images = await testPollinationsAI();
    // Summary
    console.log(`${colors.cyan}\n═══════════════════════════════════════════════════════════${colors.reset}`);
    log.header('📊 Test Results Summary');
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    console.log(`Configuration: ${results.config ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`Groq API:      ${results.groq ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`Edge TTS:      ${results.tts ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`Pollinations:  ${results.images ? colors.green + 'PASS' : colors.red + 'FAIL'}${colors.reset}`);
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    if (passedTests === totalTests) {
        console.log(`${colors.green}🎉 All tests passed! Your free tier setup is working perfectly.${colors.reset}`);
        console.log(`${colors.green}💰 Total cost: $0/month${colors.reset}`);
        process.exit(0);
    }
    else {
        console.log(`${colors.yellow}⚠️  Some tests failed. Check the errors above.${colors.reset}`);
        console.log(`${colors.yellow}🔧 The app will still work with fallback services.${colors.reset}`);
        process.exit(1);
    }
}
// Run tests
runAllTests().catch((error) => {
    console.error(`${colors.red}Fatal error running tests: ${error.message}${colors.reset}`);
    process.exit(1);
});
//# sourceMappingURL=test-free-services.js.map
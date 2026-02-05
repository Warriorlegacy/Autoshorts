"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextToSpeechService = void 0;
exports.getTTSService = getTTSService;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const child_process_1 = require("child_process");
/**
 * Helper function to escape text for Python command line usage
 * Handles special characters, newlines, quotes, and Unicode
 */
function escapeForPython(text) {
    return text
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/'/g, "\\'") // Escape single quotes
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs
}
/**
 * Text-to-Speech Service
 * Uses Microsoft Edge TTS (FREE) via edge-tts command line tool
 * Falls back to ffmpeg silent audio generation
 */
class TextToSpeechService {
    constructor() {
        const ttsProvider = process.env.TTS_PROVIDER || 'edge-tts';
        if (ttsProvider === 'murf') {
            console.log('🔊 TTS Service: Murf AI - Requires MURF_API_KEY');
        }
        else {
            console.log('🔊 TTS Service: Microsoft Edge TTS (Free) - Requires: pip install edge-tts');
        }
        // Check if ffmpeg is available for fallback
        this.hasFfmpeg = false;
        this.checkFfmpeg();
        // Ensure renders directory exists
        this.rendersDir = path_1.default.join(process.cwd(), 'public', 'renders');
        if (!fs_1.default.existsSync(this.rendersDir)) {
            fs_1.default.mkdirSync(this.rendersDir, { recursive: true });
        }
    }
    /**
     * Check if ffmpeg is available
     */
    async checkFfmpeg() {
        return new Promise((resolve) => {
            (0, child_process_1.exec)('ffmpeg -version', (error) => {
                if (!error) {
                    this.hasFfmpeg = true;
                    console.log('🎬 FFmpeg detected - available for fallback');
                }
                else {
                    console.log('⚠️ FFmpeg not available');
                }
                resolve();
            });
        });
    }
    /**
       * Synthesize text to speech using configured provider
       */
    async synthesize(options) {
        const ttsProvider = process.env.TTS_PROVIDER || 'edge-tts';
        // Try Murf first if configured
        if (ttsProvider === 'murf') {
            try {
                const murfResult = await this.synthesizeWithMurf(options);
                if (murfResult) {
                    return murfResult;
                }
                console.warn('⚠️ Murf TTS failed, falling back to Edge TTS');
            }
            catch (error) {
                console.error('Murf TTS error:', error);
            }
        }
        // Fall back to Edge TTS
        try {
            return await this.synthesizeWithEdgeTTS(options);
        }
        catch (error) {
            console.error('Edge TTS failed, trying alternative methods...', error);
            // Try alternative method - direct Python script
            try {
                const altResult = await this.synthesizeWithPythonScript(options);
                if (altResult && altResult.audioUrl) {
                    return altResult;
                }
            }
            catch (altError) {
                console.error('Alternative TTS also failed:', altError);
            }
            // Fall back to silent audio generation with ffmpeg
            if (this.hasFfmpeg) {
                return this.generateSilentAudioWithFfmpeg(options);
            }
            // Final fallback - no audio
            console.log('🔇 Audio disabled - no TTS service available');
            return {
                audioUrl: '',
                audioBuffer: Buffer.alloc(0),
                duration: 0,
                isMock: true,
            };
        }
    }
    /**
     * Synthesize using Murf AI
     */
    async synthesizeWithMurf(options) {
        const apiKey = process.env.MURF_API_KEY;
        if (!apiKey || apiKey === 'your_murf_api_key_here') {
            return null;
        }
        try {
            console.log(`🎙️ Generating speech with Murf AI...`);
            const voiceId = this.getMurfVoiceId(options.languageCode || 'en-US', options.ssmlGender || 'FEMALE');
            const response = await fetch('https://api.murf.ai/v1/speech/generate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: options.text,
                    voiceId: voiceId,
                    format: 'MP3',
                    speed: options.speakingRate || 1.0,
                    pitch: options.pitch || 0,
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error(`Murf API error: ${response.status} - ${error}`);
                return null;
            }
            const data = await response.json();
            if (!data.audioUrl && !data.audioFile) {
                console.error('No audio URL in Murf response');
                return null;
            }
            const audioUrl = data.audioUrl || data.audioFile;
            if (!audioUrl)
                return null;
            const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
            const filepath = path_1.default.join(this.rendersDir, filename);
            const downloadResponse = await fetch(audioUrl);
            if (!downloadResponse.ok) {
                console.error('Failed to download Murf audio');
                return null;
            }
            const audioBuffer = await downloadResponse.arrayBuffer();
            await (0, util_1.promisify)(fs_1.default.writeFile)(filepath, Buffer.from(audioBuffer));
            const backendPort = process.env.PORT || '3001';
            const resultUrl = `http://localhost:${backendPort}/renders/${filename}`;
            const durationMs = Math.round((audioBuffer.byteLength / 16000) * 1000);
            console.log(`✅ Murf audio generated: ${filename} (${durationMs}ms)`);
            return {
                audioUrl: resultUrl,
                audioBuffer: Buffer.from(audioBuffer),
                duration: durationMs,
                isMock: false,
            };
        }
        catch (error) {
            console.error('Murf TTS error:', error);
            return null;
        }
    }
    getMurfVoiceId(languageCode, gender) {
        const voiceMap = {
            'en-US-female': 'en-US-female-1',
            'en-US-male': 'en-US-male-1',
            'en-GB-female': 'en-GB-female-1',
            'en-GB-male': 'en-GB-male-1',
            'es-ES-female': 'es-ES-female-1',
            'es-ES-male': 'es-ES-male-1',
            'fr-FR-female': 'fr-FR-female-1',
            'fr-FR-male': 'fr-FR-male-1',
            'de-DE-female': 'de-DE-female-1',
            'de-DE-male': 'de-DE-male-1',
            'pt-BR-female': 'pt-BR-female-1',
            'pt-BR-male': 'pt-BR-male-1',
            'ja-JP-female': 'ja-JP-female-1',
            'ja-JP-male': 'ja-JP-male-1',
        };
        const key = `${languageCode}-${gender.toLowerCase()}`;
        return voiceMap[key] || voiceMap['en-US-female'];
    }
    /**
     * Alternative TTS using direct Python script approach
     */
    async synthesizeWithPythonScript(options) {
        const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const filepath = path_1.default.join(this.rendersDir, filename);
        const voice = this.getVoiceForLanguage(options.languageCode || 'en-US', options.ssmlGender || 'NEUTRAL');
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const pythonPaths = [
                `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python314\\Scripts`,
                `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python313\\Scripts`,
                `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python312\\Scripts`,
                `C:\\Python314\\Scripts`,
                `C:\\Python313\\Scripts`,
                `C:\\Python312\\Scripts`,
            ];
            const env = {
                ...process.env,
                PATH: `${pythonPaths.join(';')};${process.env.PATH}`
            };
            // Use -c to run Python code directly
            const escapedText = escapeForPython(options.text);
            const escapedPath = filepath.replace(/\\/g, '\\\\');
            const scriptCode = `import asyncio; import edge_tts; communicate = edge_tts.Communicate("${escapedText}", "${voice}"); asyncio.run(communicate.save("${escapedPath}"))`;
            console.log(`🔄 Trying alternative TTS method...`);
            const pythonPath = this.findEdgeTTSPath();
            const proc = spawn(pythonPath, ['-c', scriptCode], {
                env,
                timeout: 120000,
                windowsHide: true
            });
            let stderr = '';
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', async (code) => {
                // Check if file was created regardless of exit code
                if (fs_1.default.existsSync(filepath)) {
                    const audioBuffer = await (0, util_1.promisify)(fs_1.default.readFile)(filepath);
                    const durationMs = Math.round((audioBuffer.length / 16000) * 1000);
                    const backendPort = process.env.PORT || '3001';
                    const audioUrl = `http://localhost:${backendPort}/renders/${filename}`;
                    console.log(`✅ Alternative TTS worked: ${filename} (code: ${code})`);
                    resolve({
                        audioUrl,
                        audioBuffer,
                        duration: durationMs,
                        isMock: false,
                    });
                }
                else {
                    console.error(`❌ Alternative TTS failed, code: ${code}, stderr: ${stderr.substring(0, 200)}`);
                    reject(new Error(`Alternative TTS failed: ${stderr || 'Unknown error'}`));
                }
            });
            proc.on('error', (err) => {
                console.error(`❌ Process error: ${err.message}`);
                reject(err);
            });
        });
    }
    /**
     * Synthesize using Microsoft Edge TTS CLI (FREE)
     * Uses the edge-tts Python package via command line
     */
    async synthesizeWithEdgeTTS(options) {
        const filename = `audio_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const filepath = path_1.default.join(this.rendersDir, filename);
        // Map language code to Edge TTS voice
        const voice = this.getVoiceForLanguage(options.languageCode || 'en-US', options.ssmlGender || 'NEUTRAL');
        try {
            // Use Python with edge-tts module - spawn approach
            const escapedText = options.text.replace(/"/g, '\\"');
            const pythonPath = this.findEdgeTTSPath();
            console.log(`🔊 Generating audio with voice: ${voice}, text length: ${options.text.length}`);
            const startTime = Date.now();
            // Run using spawn for better error handling
            const audioUrl = await this.runEdgeTTSSpawn(pythonPath, voice, escapedText, filepath);
            // Check if file was created
            if (!fs_1.default.existsSync(filepath)) {
                throw new Error('Audio file was not created');
            }
            // Read the generated file
            const audioBuffer = await (0, util_1.promisify)(fs_1.default.readFile)(filepath);
            // Calculate approximate duration (MP3 at ~24kbps for speech)
            const durationMs = Math.round((audioBuffer.length / 16000) * 1000);
            const generationTime = Date.now() - startTime;
            // Use absolute URL with backend port
            const backendPort = process.env.PORT || '3001';
            const resultUrl = `http://localhost:${backendPort}/renders/${filename}`;
            console.log(`✅ Generated audio: ${filename} (${durationMs}ms) in ${generationTime}ms - Edge TTS (FREE)`);
            return {
                audioUrl: resultUrl,
                audioBuffer,
                duration: durationMs,
                isMock: false,
            };
        }
        catch (error) {
            console.error('Edge TTS synthesis failed:', error);
            throw error;
        }
    }
    /**
     * Run edge-tts using spawn for better output handling
     */
    runEdgeTTSSpawn(pythonPath, voice, text, outputPath) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const pythonPaths = [
                `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python314\\Scripts`,
                `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python313\\Scripts`,
                `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python312\\Scripts`,
                `${process.env.USERPROFILE}\\AppData\\Local\\Programs\\Python\\Python314\\Scripts`,
                `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python314\\Scripts`,
                `C:\\Python314\\Scripts`,
                `C:\\Python313\\Scripts`,
                `C:\\Python312\\Scripts`,
            ];
            const env = {
                ...process.env,
                PATH: `${pythonPaths.join(';')};${process.env.PATH}`
            };
            // Use -c to run Python code directly
            const escapedText = escapeForPython(text);
            const escapedPath = outputPath.replace(/\\/g, '\\\\');
            const scriptCode = `import asyncio; import edge_tts; communicate = edge_tts.Communicate("${escapedText}", "${voice}"); asyncio.run(communicate.save("${escapedPath}"))`;
            const proc = spawn(pythonPath, ['-c', scriptCode], {
                env,
                timeout: 120000,
                windowsHide: true
            });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', (code) => {
                console.log(`🔧 Spawn exit code: ${code}, stderr length: ${stderr.length}`);
                // Check if file was created regardless of exit code
                if (fs_1.default.existsSync(outputPath)) {
                    console.log(`✅ File created successfully`);
                    const backendPort = process.env.PORT || '3001';
                    resolve(`http://localhost:${backendPort}/renders/${path_1.default.basename(outputPath)}`);
                }
                else if (code === 0 || stderr.length < 100) {
                    // Sometimes edge-tts outputs warnings but still works
                    console.log(`⚠️  Process completed but file not found, stderr: ${stderr.substring(0, 200)}`);
                    reject(new Error(`Audio file not created, stderr: ${stderr}`));
                }
                else {
                    console.error(`❌ TTS failed with code ${code}: ${stderr}`);
                    reject(new Error(`TTS failed: ${stderr || 'Unknown error'}`));
                }
            });
            proc.on('error', (err) => {
                console.error(`❌ Process error: ${err.message}`);
                reject(err);
            });
        });
    }
    /**
      * Execute a shell command and return a promise
      * For edge-tts, we need to check if the output file was created even if there's an error
      */
    async executeCommand(command, checkFilePath) {
        const pythonPaths = [
            `C:\\Python314\\Scripts`,
            `C:\\Python313\\Scripts`,
            `C:\\Python312\\Scripts`,
            `C:\\Python311\\Scripts`,
            `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python314\\Scripts`,
            `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python313\\Scripts`,
            `${process.env.USERPROFILE}\\AppData\\Roaming\\Python\\Python312\\Scripts`,
            `${process.env.USERPROFILE}\\AppData\\Local\\Programs\\Python\\Python314\\Scripts`,
            `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python314\\Scripts`,
        ].filter(p => {
            try {
                return fs_1.default.existsSync(p);
            }
            catch {
                return false;
            }
        });
        const env = {
            ...process.env,
            PATH: `${pythonPaths.join(';')};${process.env.PATH}`
        };
        return new Promise((resolve, reject) => {
            console.log(`🔧 Running command: ${command.substring(0, 100)}...`);
            (0, child_process_1.exec)(command, { timeout: 120000, env }, (error, stdout, stderr) => {
                console.log(`🔧 Command stdout: ${stdout?.substring(0, 200) || '(empty)'}`);
                console.log(`🔧 Command stderr: ${stderr?.substring(0, 200) || '(empty)'}`);
                // For edge-tts, check if file was created even if there's an error
                if (checkFilePath && fs_1.default.existsSync(checkFilePath)) {
                    console.log(`✅ TTS file created successfully despite exit code: ${error?.code}`);
                    resolve();
                    return;
                }
                if (error) {
                    // Check if edge-tts is not installed
                    if (error.message.includes('not recognized') || error.message.includes('not found') || error.message.includes('ENOENT')) {
                        reject(new Error('edge-tts CLI not found. Install with: pip install edge-tts'));
                    }
                    else {
                        reject(new Error(`TTS command failed: ${error.message} (code: ${error.code})`));
                    }
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Find the edge-tts executable path
     */
    findEdgeTTSPath() {
        // Check for Python installation first, then use -m edge_tts
        const pythonVersions = ['C:\\Python314\\python.exe', 'C:\\Python313\\python.exe', 'C:\\Python312\\python.exe', 'C:\\Python311\\python.exe', 'python', 'python3', 'py'];
        for (const pythonPath of pythonVersions) {
            try {
                if (pythonPath.includes('\\')) {
                    if (fs_1.default.existsSync(pythonPath)) {
                        return pythonPath;
                    }
                }
                else {
                    // Try to run python --version to check if available
                    return pythonPath;
                }
            }
            catch {
                continue;
            }
        }
        return 'python';
    }
    /**
     * Build the edge-tts command using Python module
     */
    buildEdgeTTSCommand(pythonPath, voice, text, outputPath) {
        // Use Python with -m edge_tts module
        const escapedText = text.replace(/"/g, '\\"');
        return `${pythonPath} -m edge_tts --voice "${voice}" --text "${escapedText}" --write-media "${outputPath}"`;
    }
    /**
     * Map language code and gender to Edge TTS voice
     */
    getVoiceForLanguage(languageCode, gender) {
        const voiceMap = {
            'en-US': gender === 'MALE' ? 'en-US-GuyNeural' : 'en-US-JennyNeural',
            'en-GB': gender === 'MALE' ? 'en-GB-RyanNeural' : 'en-GB-SoniaNeural',
            'es-ES': gender === 'MALE' ? 'es-ES-AlvaroNeural' : 'es-ES-ElviraNeural',
            'fr-FR': gender === 'MALE' ? 'fr-FR-HenriNeural' : 'fr-FR-DeniseNeural',
            'de-DE': gender === 'MALE' ? 'de-DE-ConradNeural' : 'de-DE-KatjaNeural',
            'hi-IN': gender === 'MALE' ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural',
            'pt-BR': gender === 'MALE' ? 'pt-BR-AntonioNeural' : 'pt-BR-FranciscaNeural',
            'it-IT': gender === 'MALE' ? 'it-IT-DiegoNeural' : 'it-IT-ElsaNeural',
            'ja-JP': gender === 'MALE' ? 'ja-JP-KeitaNeural' : 'ja-JP-NanamiNeural',
            'ko-KR': gender === 'MALE' ? 'ko-KR-InJoonNeural' : 'ko-KR-SunHiNeural',
            'zh-CN': gender === 'MALE' ? 'zh-CN-YunjianNeural' : 'zh-CN-XiaoxiaoNeural',
            'ru-RU': gender === 'MALE' ? 'ru-RU-DmitryNeural' : 'ru-RU-SvetlanaNeural',
        };
        return voiceMap[languageCode] || 'en-US-JennyNeural';
    }
    /**
     * Synthesize SSML to speech
     */
    async synthesizeSSML(ssml, languageCode = 'en-US', voiceName = 'en-US-JennyNeural') {
        try {
            // Extract text from SSML for Edge TTS (Edge TTS doesn't support SSML directly)
            const textOnly = ssml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            return await this.synthesizeWithEdgeTTS({
                text: textOnly || 'speech',
                languageCode,
                voiceName,
            });
        }
        catch (error) {
            console.error('SSML synthesis failed:', error);
            // Fallback - generate silent audio with text-based duration estimation
            if (this.hasFfmpeg) {
                const textOnly = ssml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                return this.generateSilentAudioWithFfmpeg({
                    text: textOnly || 'speech',
                    languageCode,
                    voiceName,
                });
            }
            return {
                audioUrl: '',
                audioBuffer: Buffer.alloc(0),
                duration: 0,
                isMock: true,
            };
        }
    }
    /**
     * Generate silent audio using ffmpeg as a fallback
     */
    async generateSilentAudioWithFfmpeg(options) {
        // Estimate duration based on text length (average speaking rate: ~150 words per minute)
        const wordCount = options.text.split(/\s+/).length;
        const durationSec = Math.max(2, (wordCount / 2.5) / (options.speakingRate || 1));
        const durationMs = Math.round(durationSec * 1000);
        const filename = `audio_silent_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const filepath = path_1.default.join(this.rendersDir, filename);
        // Generate silent MP3 using ffmpeg
        const ffmpegCmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t ${durationSec} -acodec libmp3lame -q:a 4 "${filepath}" -y`;
        try {
            await new Promise((resolve, reject) => {
                (0, child_process_1.exec)(ffmpegCmd, (error, stdout, stderr) => {
                    if (error) {
                        console.error('FFmpeg error:', error);
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                });
            });
            // Read the generated file
            const audioBuffer = await (0, util_1.promisify)(fs_1.default.readFile)(filepath);
            // Use absolute URL with backend port
            const backendPort = process.env.PORT || '3001';
            const audioUrl = `http://localhost:${backendPort}/renders/${filename}`;
            console.log(`🔇 Generated silent audio: ${filename} (${durationMs}ms) - FFmpeg`);
            return {
                audioUrl,
                audioBuffer,
                duration: durationMs,
                isMock: true, // Mark as mock so it can be skipped if needed
            };
        }
        catch (error) {
            console.error('Failed to generate silent audio with ffmpeg:', error);
            return {
                audioUrl: '',
                audioBuffer: Buffer.alloc(0),
                duration: 0,
                isMock: true,
            };
        }
    }
    /**
     * Get available voices
     */
    async getAvailableVoices(languageCode) {
        return this.getEdgeTTSVoices(languageCode);
    }
    /**
     * Get Edge TTS voices
     */
    getEdgeTTSVoices(languageCode) {
        const allVoices = [
            // English (US)
            { name: 'en-US-JennyNeural', ssmlGender: 'FEMALE', languageCode: 'en-US', displayName: 'Jenny (US)' },
            { name: 'en-US-GuyNeural', ssmlGender: 'MALE', languageCode: 'en-US', displayName: 'Guy (US)' },
            { name: 'en-US-AriaNeural', ssmlGender: 'FEMALE', languageCode: 'en-US', displayName: 'Aria (US)' },
            { name: 'en-US-DavisNeural', ssmlGender: 'MALE', languageCode: 'en-US', displayName: 'Davis (US)' },
            // English (UK)
            { name: 'en-GB-SoniaNeural', ssmlGender: 'FEMALE', languageCode: 'en-GB', displayName: 'Sonia (UK)' },
            { name: 'en-GB-RyanNeural', ssmlGender: 'MALE', languageCode: 'en-GB', displayName: 'Ryan (UK)' },
            // Spanish
            { name: 'es-ES-ElviraNeural', ssmlGender: 'FEMALE', languageCode: 'es-ES', displayName: 'Elvira (ES)' },
            { name: 'es-ES-AlvaroNeural', ssmlGender: 'MALE', languageCode: 'es-ES', displayName: 'Alvaro (ES)' },
            { name: 'es-MX-DaliaNeural', ssmlGender: 'FEMALE', languageCode: 'es-MX', displayName: 'Dalia (MX)' },
            // French
            { name: 'fr-FR-DeniseNeural', ssmlGender: 'FEMALE', languageCode: 'fr-FR', displayName: 'Denise (FR)' },
            { name: 'fr-FR-HenriNeural', ssmlGender: 'MALE', languageCode: 'fr-FR', displayName: 'Henri (FR)' },
            // German
            { name: 'de-DE-KatjaNeural', ssmlGender: 'FEMALE', languageCode: 'de-DE', displayName: 'Katja (DE)' },
            { name: 'de-DE-ConradNeural', ssmlGender: 'MALE', languageCode: 'de-DE', displayName: 'Conrad (DE)' },
            // Hindi
            { name: 'hi-IN-SwaraNeural', ssmlGender: 'FEMALE', languageCode: 'hi-IN', displayName: 'Swara (IN)' },
            { name: 'hi-IN-MadhurNeural', ssmlGender: 'MALE', languageCode: 'hi-IN', displayName: 'Madhur (IN)' },
            // Portuguese
            { name: 'pt-BR-FranciscaNeural', ssmlGender: 'FEMALE', languageCode: 'pt-BR', displayName: 'Francisca (BR)' },
            { name: 'pt-BR-AntonioNeural', ssmlGender: 'MALE', languageCode: 'pt-BR', displayName: 'Antonio (BR)' },
            // Italian
            { name: 'it-IT-ElsaNeural', ssmlGender: 'FEMALE', languageCode: 'it-IT', displayName: 'Elsa (IT)' },
            { name: 'it-IT-DiegoNeural', ssmlGender: 'MALE', languageCode: 'it-IT', displayName: 'Diego (IT)' },
            // Japanese
            { name: 'ja-JP-NanamiNeural', ssmlGender: 'FEMALE', languageCode: 'ja-JP', displayName: 'Nanami (JP)' },
            { name: 'ja-JP-KeitaNeural', ssmlGender: 'MALE', languageCode: 'ja-JP', displayName: 'Keita (JP)' },
            // Korean
            { name: 'ko-KR-SunHiNeural', ssmlGender: 'FEMALE', languageCode: 'ko-KR', displayName: 'Sun-Hi (KR)' },
            { name: 'ko-KR-InJoonNeural', ssmlGender: 'MALE', languageCode: 'ko-KR', displayName: 'InJoon (KR)' },
            // Chinese
            { name: 'zh-CN-XiaoxiaoNeural', ssmlGender: 'FEMALE', languageCode: 'zh-CN', displayName: 'Xiaoxiao (CN)' },
            { name: 'zh-CN-YunjianNeural', ssmlGender: 'MALE', languageCode: 'zh-CN', displayName: 'Yunjian (CN)' },
            // Russian
            { name: 'ru-RU-SvetlanaNeural', ssmlGender: 'FEMALE', languageCode: 'ru-RU', displayName: 'Svetlana (RU)' },
            { name: 'ru-RU-DmitryNeural', ssmlGender: 'MALE', languageCode: 'ru-RU', displayName: 'Dmitry (RU)' },
        ];
        if (languageCode) {
            return allVoices.filter(voice => voice.languageCode === languageCode);
        }
        return allVoices;
    }
    /**
     * Clean up old audio files (older than 24 hours)
     */
    async cleanupOldAudio(maxAgeHours = 24) {
        try {
            const files = fs_1.default.readdirSync(this.rendersDir);
            const now = Date.now();
            let deletedCount = 0;
            for (const file of files) {
                if (file.startsWith('audio_') && file.endsWith('.mp3')) {
                    const filepath = path_1.default.join(this.rendersDir, file);
                    const stats = fs_1.default.statSync(filepath);
                    const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);
                    if (ageHours > maxAgeHours) {
                        fs_1.default.unlinkSync(filepath);
                        deletedCount++;
                    }
                }
            }
            if (deletedCount > 0) {
                console.log(`🗑️ Cleaned up ${deletedCount} old audio files`);
            }
            return deletedCount;
        }
        catch (error) {
            console.error('Error cleaning up audio files:', error);
            return 0;
        }
    }
}
exports.TextToSpeechService = TextToSpeechService;
// Singleton instance
let ttsService = null;
function getTTSService() {
    if (!ttsService) {
        ttsService = new TextToSpeechService();
    }
    return ttsService;
}
//# sourceMappingURL=ttsService.js.map
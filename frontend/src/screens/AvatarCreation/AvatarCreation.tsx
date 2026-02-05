import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVideoStore } from '../../store/videoStore';
import { AvatarGenerateRequest } from '../../api/avatar';
import { videoAPI } from '../../api/videos';

const languages = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' }
];

const voiceOptions = [
  { id: 'en-US-JennyNeural', name: 'Jenny (Female)', gender: 'FEMALE' },
  { id: 'en-US-GuyNeural', name: 'Guy (Male)', gender: 'MALE' },
  { id: 'en-US-AriaNeural', name: 'Aria (Female)', gender: 'FEMALE' },
  { id: 'en-US-DavisNeural', name: 'Davis (Male)', gender: 'MALE' },
  { id: 'en-US-MichelleNeural', name: 'Michelle (Female)', gender: 'FEMALE' },
  { id: 'en-US-JessaNeural', name: 'Jessa (Female)', gender: 'FEMALE' },
];

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  supportsImageInput?: boolean;
  models: Array<{ id: string; name: string; description: string }>;
}

const AvatarCreation = () => {
  const navigate = useNavigate();
  const { generateAvatarVideo, pollAvatarStatus, isGenerating, avatarProgress, error, clearError } = useVideoStore();
  
  const [avatarImage, setAvatarImage] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<'tts' | 'upload'>('tts');
  const [script, setScript] = useState<string>('');
  const [voiceName, setVoiceName] = useState<string>('en-US-JennyNeural');
  const [language, setLanguage] = useState<string>('en-US');
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('skyreels');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await videoAPI.getProviders();
        if (response.providers?.avatar) {
          setProviders(response.providers.avatar);
          setSelectedProvider(response.defaults?.avatar || 'skyreels');
        }
      } catch (err) {
        console.error('Failed to fetch providers:', err);
      }
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    if (error) {
      setLocalError(error);
      clearError();
    }
  }, [error, clearError]);

  const requiresImage = selectedProvider === 'skyreels';

  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setLocalError('Image file too large. Max 10MB allowed.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarImage(base64String);
      setAvatarPreview(base64String);
      setIsUploading(false);
      setLocalError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle audio file upload
  const handleAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setLocalError('Audio file too large. Max 20MB allowed.');
      return;
    }

    setAudioFile(file);
    setCustomAudioUrl(URL.createObjectURL(file));
    setLocalError(null);
  }, []);

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Client-side validation with clear, actionable messages
    if (requiresImage && !avatarImage) {
      setLocalError(`⚠️ ${providers.find(p => p.id === selectedProvider)?.name || 'This model'} requires an avatar image. Please upload a portrait photo or switch to "SkyReels Text-to-Video" for optional image support.`);
      return;
    }

    if (audioSource === 'tts' && !script.trim()) {
      setLocalError('Please enter a script for text-to-speech in the "Script / Narration" field.');
      return;
    }

    if (audioSource === 'upload' && !audioFile && !customAudioUrl) {
      setLocalError('Please upload an audio file or provide an audio URL.');
      return;
    }

    setIsUploading(true);
    try {
      const request: AvatarGenerateRequest = {
        avatarImage: requiresImage ? avatarImage : (avatarImage || undefined),
        audioSource,
        script: audioSource === 'tts' ? script : undefined,
        voiceName: audioSource === 'tts' ? voiceName : undefined,
        language: audioSource === 'tts' ? language : undefined,
        speakingRate: audioSource === 'tts' ? speakingRate : undefined,
        prompt: prompt || undefined,
        customAudioUrl: audioSource === 'upload' ? customAudioUrl : undefined,
        provider: selectedProvider as 'skyreels' | 'skyreels-text',
      };

      const videoId = await generateAvatarVideo(request);

      if (videoId) {
        setIsUploading(false);
        setIsPolling(true);
        
        pollAvatarStatus(videoId, (_videoUrl: string) => {
          setIsPolling(false);
          navigate(`/review/${videoId}`);
        });
      } else {
        setIsUploading(false);
      }
    } catch (error: any) {
      console.error('Avatar generation error:', error);
      setIsUploading(false);
      
      // Parse and display user-friendly error messages
      let errorMessage = 'Failed to generate avatar video. Please try again.';
      
      if (error.message) {
        if (error.message.includes('Avatar image is required')) {
          errorMessage = `⚠️ ${error.message}. For image-based generation, please upload a portrait photo. For text-only generation, switch to "SkyReels Text-to-Video".`;
        } else if (error.message.includes('TTS generation failed')) {
          errorMessage = `🔊 Audio generation failed. Please check:
• Your internet connection
• Try a different voice or language
• Use the "Upload Audio" option instead`;
        } else if (error.message.includes('Failed to generate audio')) {
          errorMessage = `🔊 Could not generate speech audio. This might be due to:
• Voice service temporary unavailable
• Unsupported language/voice combination
• Try switching to "Upload Audio" option`;
        } else if (error.message.includes('SkyReels')) {
          errorMessage = `🎬 Video generation service error: ${error.message}. Please check your API key configuration.`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setLocalError(errorMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-h1 font-heading mb-2">Create Avatar Video</h1>
      <p className="text-gray-600 mb-8">
        Transform static images into talking avatar videos with AI-powered lip-sync
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Provider Selection */}
        {providers.length > 0 && (
          <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-h2 font-heading mb-6">🎬 Video Generation Model</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedProvider === provider.id
                      ? 'border-primary-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{provider.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{provider.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {provider.supportsImageInput !== false ? '✅ Supports image input' : '❌ Text-to-video only'}
                  </div>
                </button>
              ))}
            </div>
            {localError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                {localError}
              </div>
            )}
          </motion.div>
        )}

        {/* Avatar Image Upload - Optional for Text-to-Video, Required for Image-to-Video */}
        <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-h2 font-heading mb-6">
            {requiresImage ? '📷 Avatar Image (Required)' : '📷 Avatar Image (Optional)'}
          </h2>
          <p className="text-gray-600 mb-4">
            {requiresImage 
              ? 'Upload a portrait photo to use as the avatar.'
              : 'Upload a custom avatar image, or leave empty to use the default AI-generated avatar.'}
          </p>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <div className="w-48 h-64 rounded-xl overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-50">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm">No avatar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-3">
                {requiresImage ? 'Upload Avatar Image' : 'Upload Avatar Image (Optional)'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                  disabled={isUploading || isGenerating || isPolling}
                />
                <label 
                  htmlFor="avatar-upload" 
                  className={`cursor-pointer flex flex-col items-center justify-center ${isUploading ? 'opacity-50' : ''}`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                      <p>Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-600">Click to upload avatar</p>
                      <p className="text-gray-400 text-sm">PNG, JPG up to 10MB</p>
                      <p className="text-blue-500 text-sm mt-2">Best results with portrait photos</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Audio Source Selection */}
        <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-h2 font-heading mb-6">🔊 Audio Source</h2>
          
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setAudioSource('tts')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                audioSource === 'tts'
                  ? 'border-primary-blue bg-blue-50 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              🎤 Text-to-Speech
            </button>
            <button
              type="button"
              onClick={() => setAudioSource('upload')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                audioSource === 'upload'
                  ? 'border-primary-blue bg-blue-50 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              📁 Upload Audio
            </button>
          </div>

          {audioSource === 'tts' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Script / Narration</label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
                  rows={4}
                  placeholder="Enter the script that the avatar will speak..."
                  disabled={isGenerating || isPolling}
                />
                <p className="text-sm text-gray-500 mt-2">
                  💡 Tip: Keep it natural and conversational for best lip-sync results
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-3">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
                    disabled={isGenerating || isPolling}
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Voice</label>
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
                    disabled={isGenerating || isPolling}
                  >
                    {voiceOptions.map(voice => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">
                  Speaking Rate: {speakingRate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={speakingRate}
                  onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                  className="w-full"
                  disabled={isGenerating || isPolling}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-3">Upload Audio File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                    id="audio-upload"
                    disabled={isGenerating || isPolling}
                  />
                  <label 
                    htmlFor="audio-upload" 
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {audioFile ? (
                      <div className="flex flex-col items-center">
                        <span className="text-green-500 text-2xl mb-2">✓</span>
                        <p className="text-gray-600">{audioFile.name}</p>
                        <p className="text-gray-400 text-sm">
                          {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <>
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <p className="text-gray-600">Click to upload audio</p>
                        <p className="text-gray-400 text-sm">MP3, WAV up to 20MB</p>
                      </>
                    )}
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  💡 Tip: Use clear speech with minimal background noise for best results
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Or enter audio URL</label>
                <input
                  type="url"
                  value={customAudioUrl}
                  onChange={(e) => setCustomAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
                  disabled={isGenerating || isPolling}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Optional Prompt */}
        <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-h2 font-heading mb-6">💡 Behavior Prompt (Optional)</h2>
          
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
            rows={3}
            placeholder="Describe how the avatar should behave... (e.g., 'The person speaks naturally and enthusiastically, making eye contact with the camera')"
            disabled={isGenerating || isPolling}
          />
        </motion.div>

        {/* Progress Indicator */}
        {isPolling && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-50 rounded-2xl p-6 border border-blue-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-800">
                🎬 Generating Avatar Video...
              </h3>
              <span className="text-blue-600">{Math.round(avatarProgress)}%</span>
            </div>
            
            <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${avatarProgress}%` }}
              />
            </div>
            
            <p className="text-sm text-blue-600">
              ⏳ This may take a few minutes. Avatar lip-sync generation is in progress...
            </p>
          </motion.div>
        )}

        {/* Generate Button */}
        <div className="flex justify-center">
          <motion.button
            type="submit"
            disabled={isGenerating || isPolling || (requiresImage && !avatarImage) || (audioSource === 'tts' && !script) || (audioSource === 'upload' && !audioFile && !customAudioUrl)}
            whileHover={{ scale: isGenerating || isPolling ? 1 : 1.02 }}
            whileTap={{ scale: isGenerating || isPolling ? 1 : 0.98 }}
            className={`px-8 py-4 rounded-full text-button font-semibold transition-all flex items-center ${
              isGenerating || isPolling || (requiresImage && !avatarImage) || (audioSource === 'tts' && !script) || (audioSource === 'upload' && !audioFile && !customAudioUrl)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {isGenerating || isPolling ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isPolling ? 'Generating Avatar...' : 'Starting...'}
              </>
            ) : (
              <>
                ✨ Generate Avatar Video
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default AvatarCreation;

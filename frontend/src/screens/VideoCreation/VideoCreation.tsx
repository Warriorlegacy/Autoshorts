import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVideoStore } from '../../store/videoStore';
import { GenerateVideoRequest, TextToVideoRequest } from '../../api/videos';

const niches = [
  'Scary Stories', 'True Crime', 'Real Tragedies', 'Anime Stories', 'Heists',
  'Technology', 'Gaming', 'Education', 'Motivation',
  'Science', 'Finance', 'Health', 'History', 'Lifestyle', 'Entertainment'
];

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
  { id: 'en-US-Neural2-A', name: 'Alex (Male)', gender: 'MALE' },
  { id: 'en-US-Neural2-C', name: 'Aria (Female)', gender: 'FEMALE' },
  { id: 'en-US-Neural2-E', name: 'Ethan (Male)', gender: 'MALE' },
  { id: 'en-US-Neural2-F', name: 'Sage (Female)', gender: 'FEMALE' },
];

const visualStyles = [
  { id: 'cinematic', name: 'Cinematic Realism', description: 'Film-quality, professional look' },
  { id: 'animated', name: 'Animated Graphics', description: 'Dynamic motion graphics' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean and simple design' },
  { id: 'documentary', name: 'Documentary', description: 'Educational, informative style' },
  { id: 'stock', name: 'Stock Footage', description: 'High-quality stock video clips' }
];

interface VideoFormData extends GenerateVideoRequest {
  isTextToVideo?: boolean;
  prompt?: string;
  images?: string[]; // Base64 encoded images
  voiceName?: string;
  speakingRate?: number;
  generateImages?: boolean;
  scriptProvider?: string;
  scriptModel?: string;
  imageProvider?: string;
  imageModel?: string;
  ttsProvider?: string;
  ttsModel?: string;
}

const VideoCreation = () => {
  const navigate = useNavigate();
  const { generateVideo, generateTextToVideo, isGenerating } = useVideoStore();
  
  const [formData, setFormData] = useState<VideoFormData>({
    niche: '',
    language: 'en-US',
    duration: 30,
    visualStyle: 'cinematic',
    contentSource: 'auto',
    prompt: '',
    voiceName: 'en-US-JennyNeural',
    speakingRate: 1.0,
    generateImages: true,
    isTextToVideo: false,
    images: [],
    ttsProvider: 'edge-tts',
    ttsModel: 'en-US-JennyNeural',
  });

  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [providers, setProviders] = useState<any>(null);

  // Fetch available providers on mount
  React.useEffect(() => {
    const fetchProviders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/videos/providers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProviders(data.providers);
          // Set default providers
          setFormData(prev => ({
            ...prev,
            scriptProvider: data.defaults?.script || 'groq',
            imageProvider: data.defaults?.image || 'pollinations',
            ttsProvider: data.defaults?.tts || 'edge-tts',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };
    fetchProviders();
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPreviews: string[] = [...previews];
    const newImages: string[] = [...(formData.images || [])];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        newPreviews.push(base64String);
        newImages.push(base64String);
        
        // Update state when all files are processed
        if (newPreviews.length === newPreviews.length) {
          setPreviews(newPreviews);
          setFormData(prev => ({ ...prev, images: newImages }));
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [previews, formData.images]);

  // Remove image
  const removeImage = (index: number) => {
    const newPreviews = [...previews];
    const newImages = [...(formData.images || [])];
    newPreviews.splice(index, 1);
    newImages.splice(index, 1);
    setPreviews(newPreviews);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let videoId: string | null = null;
    
    if (formData.isTextToVideo) {
      const request: TextToVideoRequest = {
        prompt: formData.prompt || '',
        images: formData.images,
        duration: formData.duration,
        style: formData.visualStyle,
        language: formData.language,
        voiceName: formData.voiceName,
        speakingRate: formData.speakingRate,
      };
      
      try {
        videoId = await generateTextToVideo(request);
      } catch (error: any) {
        if (error.message?.includes('IMAGE_INPUT_NOT_SUPPORTED') || error.message?.includes('clipboard') || error.message?.includes('image input')) {
          alert('❌ Image input not supported in Text-to-Video mode.\n\nThe AI model does not accept uploaded images. Please:\n\n1. Remove uploaded images and try again, OR\n2. Use "Standard Video" mode instead');
          return;
        }
        throw error;
      }
    } else {
      videoId = await generateVideo(formData);
    }
    
    if (videoId) {
      navigate(`/review/${videoId}`);
    }
  };

  const navigateToAvatar = () => {
    navigate('/create/avatar');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Create New Video</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Mode Toggle */}
        <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h2 className="text-xl font-bold mb-6 text-gray-900">Mode Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isTextToVideo: false })}
              className={`py-4 px-4 rounded-xl border-2 transition-all ${
                !formData.isTextToVideo
                  ? 'border-primary-blue bg-blue-50 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg">🎬 Standard Video</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">AI-generated scenes with narration</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isTextToVideo: true })}
              className={`py-4 px-4 rounded-xl border-2 transition-all ${
                formData.isTextToVideo
                  ? 'border-primary-blue bg-blue-50 font-semibold'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-lg">📝 Text to Video</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Your script + AI visuals</div>
            </button>
            <button
              type="button"
              onClick={navigateToAvatar}
              className="py-4 px-4 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all bg-purple-50 hover:bg-purple-100"
            >
              <div className="text-lg">🎭 Avatar Video</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Talking avatar with lip-sync</div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/create/ai-video')}
              className="py-4 px-4 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all bg-green-50 hover:bg-green-100"
            >
              <div className="text-lg">🤖 AI Video</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Text-to-video models</div>
            </button>
          </div>

            {/* Text-to-Video Mode */}
          {formData.isTextToVideo && (
            <>
              {/* Prompt Input */}
              <div className="mb-6">
                <label className="block text-base font-semibold mb-3 text-gray-900">Describe Your Video</label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  onPaste={(e) => {
                    try {
                      const items = e.clipboardData?.items;
                      if (items) {
                        for (const item of items) {
                          if (item.type.indexOf('image') !== -1) {
                            e.preventDefault();
                            alert('❌ Image paste not supported here.\n\nPlease upload images using the "Upload Images" button below, or switch to Standard Video mode.');
                            return;
                          }
                        }
                      }
                    } catch (err) {
                      // Ignore clipboard access errors in some browsers
                      console.log('Clipboard access not available');
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
                  rows={4}
                  placeholder="Enter a detailed description of the video you want to create..."
                  required={formData.isTextToVideo}
                />
              </div>

              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-base font-semibold mb-3 text-gray-900">Upload Images (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <label 
                    htmlFor="image-upload" 
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                        <p>Uploading images...</p>
                      </div>
                    ) : (
                      <>
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p className="text-gray-800 font-medium">Click to upload images</p>
                        <p className="text-gray-600 text-sm font-medium">PNG, JPG, GIF up to 10MB</p>
                      </>
                    )}
                  </label>
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-base font-semibold mb-2 text-gray-900">Uploaded Images:</h3>
                    <div className="flex flex-wrap gap-2">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={preview} 
                            alt={`Preview ${index}`} 
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Standard Mode */}
          {!formData.isTextToVideo && (
            <>
              {/* Niche Selection */}
              <div className="mb-6">
                <label className="block text-base font-semibold mb-3 text-gray-900">Select Niche</label>
                <select
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
                  required={!formData.isTextToVideo}
                >
                  <option value="">Choose a niche...</option>
                  {niches.map(niche => (
                    <option key={niche} value={niche}>{niche}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Shared Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Language Selection */}
            <div>
              <label className="block text-base font-semibold mb-3 text-gray-900">Voiceover Language</label>
              <div className="grid grid-cols-2 gap-2">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setFormData({ ...formData, language: lang.code })}
                    className={`p-2 rounded-lg border transition-all flex items-center text-sm ${
                      formData.language === lang.code 
                        ? 'border-primary-blue bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mr-1">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-base font-semibold mb-3 text-gray-900">Voice Actor</label>
              <div className="grid grid-cols-2 gap-2">
                {voiceOptions.map(voice => (
                  <button
                    key={voice.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, voiceName: voice.id })}
                    className={`p-2 rounded-lg border transition-all flex items-center text-sm ${
                      formData.voiceName === voice.id 
                        ? 'border-primary-blue bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg mr-1">{voice.gender === 'MALE' ? '👨' : '👩'}</span>
                    <span>{voice.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mt-6">
            <label className="block text-base font-semibold mb-3 text-gray-900">Duration</label>
            <div className="flex gap-4">
              {[
                { value: 30, label: '30 Seconds', desc: 'Quick & punchy' },
                { value: 60, label: '60 Seconds', desc: 'More detailed' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration: option.value as 30 | 60 })}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all text-left ${
                    formData.duration === option.value 
                      ? 'border-primary-blue bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-700 font-medium">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Visual Style Selection */}
          <div className="mt-6">
            <label className="block text-base font-semibold mb-3 text-gray-900">Visual Style</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visualStyles.map(style => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, visualStyle: style.id })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.visualStyle === style.id 
                      ? 'border-primary-blue bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{style.name}</div>
                  <div className="text-sm text-gray-700 font-medium">{style.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Provider Selection */}
          {providers && (
            <div className="mt-6">
              <label className="block text-base font-semibold mb-3 text-gray-900">AI Provider Settings</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Script Provider */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-800">Script Generation</label>
                  <select
                    value={formData.scriptProvider || ''}
                    onChange={(e) => {
                      const provider = providers.script.find((p: any) => p.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        scriptProvider: e.target.value,
                        scriptModel: provider?.models?.[0]?.id || ''
                      });
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none text-sm"
                  >
                    {providers.script?.map((provider: any) => (
                      <option key={provider.id} value={provider.id} disabled={!provider.available}>
                        {provider.name} {!provider.available && '(Unavailable)'}
                      </option>
                    ))}
                  </select>
                  {formData.scriptProvider && providers.script?.find((p: any) => p.id === formData.scriptProvider)?.models && (
                    <select
                      value={formData.scriptModel || ''}
                      onChange={(e) => setFormData({ ...formData, scriptModel: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none text-sm mt-2"
                    >
                      {providers.script?.find((p: any) => p.id === formData.scriptProvider)?.models.map((model: any) => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Image Provider */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-800">Image Generation</label>
                  <select
                    value={formData.imageProvider || ''}
                    onChange={(e) => {
                      const provider = providers.image.find((p: any) => p.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        imageProvider: e.target.value,
                        imageModel: provider?.models?.[0]?.id || ''
                      });
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none text-sm"
                  >
                    {providers.image?.map((provider: any) => (
                      <option key={provider.id} value={provider.id} disabled={!provider.available}>
                        {provider.name} {!provider.available && '(Unavailable)'}
                      </option>
                    ))}
                  </select>
                  
                  {/* Model Selection */}
                  {formData.imageProvider && providers.image?.find((p: any) => p.id === formData.imageProvider)?.models && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Select Model</label>
                      <select
                        value={formData.imageModel || ''}
                        onChange={(e) => setFormData({ ...formData, imageModel: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none text-sm"
                      >
                        {providers.image?.find((p: any) => p.id === formData.imageProvider)?.models.map((model: any) => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                      
                      {/* Model Description */}
                      {formData.imageModel && (
                        <p className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded font-medium">
                          💡 {providers.image?.find((p: any) => p.id === formData.imageProvider)?.models.find((m: any) => m.id === formData.imageModel)?.description}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Provider Info */}
                  <div className="mt-3 text-sm text-gray-700 flex items-center gap-2 font-medium">
                    {formData.imageProvider === 'craiyon' && (
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                        ✓ 100% Free - No API key
                      </span>
                    )}
                    {formData.imageProvider === 'deepai' && (
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                        ✓ Free tier available
                      </span>
                    )}
                    {formData.imageProvider === 'pollinations' && (
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                        ✓ Unlimited free
                      </span>
                    )}
                    {formData.imageProvider === 'leonardo' && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        🪙 150 credits/day
                      </span>
                    )}
                    {formData.imageProvider === 'huggingface' && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        🪙 1,000 req/month
                      </span>
                    )}
                    {formData.imageProvider === 'replicate' && (
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        🪙 Limited free tier
                      </span>
                    )}
                  </div>
                </div>

                {/* TTS Provider */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-800">Voice/TTS</label>
                  <select
                    value={formData.ttsProvider || ''}
                    onChange={(e) => {
                      const provider = providers.tts?.find((p: any) => p.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        ttsProvider: e.target.value,
                        ttsModel: provider?.models?.[0]?.id || '',
                        voiceName: provider?.models?.[0]?.id || 'en-US-JennyNeural'
                      });
                    }}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none text-sm"
                  >
                    {providers.tts?.map((provider: any) => (
                      <option key={provider.id} value={provider.id} disabled={!provider.available}>
                        {provider.name} {!provider.available && '(Unavailable)'}
                      </option>
                    ))}
                  </select>
                  
                  {/* TTS Model Selection */}
                  {formData.ttsProvider && providers.tts?.find((p: any) => p.id === formData.ttsProvider)?.models && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Select Voice</label>
                      <select
                        value={formData.ttsModel || ''}
                        onChange={(e) => setFormData({ ...formData, ttsModel: e.target.value, voiceName: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-blue-600 focus:outline-none text-sm"
                      >
                        {providers.tts?.find((p: any) => p.id === formData.ttsProvider)?.models.map((model: any) => (
                          <option key={model.id} value={model.id}>{model.name}</option>
                        ))}
                      </select>
                      
                      {/* Model Description */}
                      {formData.ttsModel && (
                        <p className="mt-2 text-sm text-gray-700 bg-gray-100 p-2 rounded font-medium">
                          💡 {providers.tts?.find((p: any) => p.id === formData.ttsProvider)?.models.find((m: any) => m.id === formData.ttsModel)?.description}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Provider Info */}
                  <div className="mt-3 text-sm text-gray-700 flex items-center gap-2 font-medium">
                    {formData.ttsProvider === 'edge-tts' && (
                      <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded">
                        ✓ 100% Free - Microsoft Edge TTS
                      </span>
                    )}
                    {formData.ttsProvider === 'murf' && (
                      <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded">
                        💰 Subscription required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Speaking Rate Slider */}
          <div className="mt-6">
            <label className="block text-base font-semibold mb-3 text-gray-900">
              Speaking Rate: <span className="text-primary-blue">{formData.speakingRate}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={formData.speakingRate}
              onChange={(e) => setFormData({ ...formData, speakingRate: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-700 mt-2 font-semibold">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>
        </motion.div>

        {/* Media Options (only for standard mode) */}
        {!formData.isTextToVideo && (
          <motion.div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900">Media Options</h2>
            <div className="mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.generateImages || false}
                  onChange={(e) => setFormData({ ...formData, generateImages: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-primary-blue focus:ring-2 focus:ring-primary-blue"
                />
                <span className="ml-3 flex flex-col">
                  <span className="font-semibold text-gray-900">Generate AI Background Images</span>
                  <span className="text-sm text-gray-700 font-medium">
                    {formData.generateImages 
                      ? '✨ AI will generate unique background images for each scene'
                      : '📷 Use default background (faster generation)'}
                  </span>
                </span>
              </label>
            </div>
          </motion.div>
        )}

          {/* Generate Button */}
          <div className="flex justify-center space-x-4">
            {formData.isTextToVideo && (
              <motion.button
                type="button"
                onClick={async () => {
                  if (!formData.prompt) return;
                  try {
                    const response = await fetch('/api/videos/preview', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                      },
                      body: JSON.stringify({
                        prompt: formData.prompt,
                        images: formData.images,
                        duration: formData.duration,
                        style: formData.visualStyle,
                        language: formData.language,
                      }),
                    });
                    if (response.ok) {
                      const data = await response.json();
                      navigate('/preview', { state: { previewData: data.preview } });
                    }
                  } catch (error) {
                    console.error('Preview failed:', error);
                  }
                }}
                disabled={!formData.prompt}
                whileHover={{ scale: !formData.prompt ? 1 : 1.02 }}
                whileTap={{ scale: !formData.prompt ? 1 : 0.98 }}
                className={`px-6 py-3 rounded-full text-button font-semibold transition-all ${
                  !formData.prompt
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-purple-500 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                👁️ Preview
              </motion.button>
            )}
            
            <motion.button
              type="submit"
              disabled={isGenerating || (formData.isTextToVideo && !formData.prompt)}
              whileHover={{ scale: isGenerating || (formData.isTextToVideo && !formData.prompt) ? 1 : 1.02 }}
              whileTap={{ scale: isGenerating || (formData.isTextToVideo && !formData.prompt) ? 1 : 0.98 }}
              className={`px-8 py-4 rounded-full text-button font-semibold transition-all flex items-center ${
                isGenerating || (formData.isTextToVideo && !formData.prompt)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-primary-blue text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                '✨ Generate Video'
              )}
            </motion.button>
          </div>
      </form>
    </motion.div>
  );
};

export default VideoCreation;
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
  { id: 'cinematic', name: 'Cinematic Realism', description: 'Film-quality, professional look', icon: '🎬', gradient: 'from-amber-500/20 to-orange-600/20', color: 'amber' },
  { id: 'animated', name: 'Animated Graphics', description: 'Dynamic motion graphics', icon: '✨', gradient: 'from-purple-500/20 to-pink-600/20', color: 'purple' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean and simple design', icon: '🎯', gradient: 'from-cyan-500/20 to-blue-600/20', color: 'cyan' },
  { id: 'documentary', name: 'Documentary', description: 'Educational, informative style', icon: '📚', gradient: 'from-emerald-500/20 to-teal-600/20', color: 'emerald' },
  { id: 'stock', name: 'Stock Footage', description: 'High-quality stock video clips', icon: '📹', gradient: 'from-rose-500/20 to-red-600/20', color: 'rose' }
];

interface VideoFormData extends GenerateVideoRequest {
  isTextToVideo?: boolean;
  prompt?: string;
  images?: string[];
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
        
        if (newPreviews.length === newPreviews.length) {
          setPreviews(newPreviews);
          setFormData(prev => ({ ...prev, images: newImages }));
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [previews, formData.images]);

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
      className="max-w-5xl mx-auto pb-20"
    >
      {/* Premium Header */}
      <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          <span className="text-gradient-hero">Create New Video</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 text-lg"
        >
          Choose your mode and customize your video settings
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Mode Selection - Premium Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-premium"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl">
              🎨
            </div>
            <h2 className="text-2xl font-bold text-white">Mode Selection</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                id: 'standard', 
                icon: '🎬', 
                title: 'Standard Video', 
                desc: 'AI-generated scenes with narration',
                gradient: 'from-blue-500/20 to-cyan-500/20',
                active: !formData.isTextToVideo
              },
              { 
                id: 'text2video', 
                icon: '📝', 
                title: 'Text to Video', 
                desc: 'Your script + AI visuals',
                gradient: 'from-purple-500/20 to-pink-500/20',
                active: formData.isTextToVideo
              },
              { 
                id: 'avatar', 
                icon: '🎭', 
                title: 'Avatar Video', 
                desc: 'Talking avatar with lip-sync',
                gradient: 'from-amber-500/20 to-orange-500/20',
                onClick: navigateToAvatar
              },
              { 
                id: 'ai', 
                icon: '🤖', 
                title: 'AI Video', 
                desc: 'Text-to-video models',
                gradient: 'from-emerald-500/20 to-teal-500/20',
                onClick: () => navigate('/create/ai-video')
              }
            ].map((mode) => (
              <motion.button
                key={mode.id}
                type="button"
                onClick={() => {
                  if (mode.onClick) {
                    mode.onClick();
                  } else if (mode.id === 'standard') {
                    setFormData({ ...formData, isTextToVideo: false });
                  } else if (mode.id === 'text2video') {
                    setFormData({ ...formData, isTextToVideo: true });
                  }
                }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative group p-5 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                  mode.active
                    ? 'border-indigo-500 bg-gradient-to-br ' + mode.gradient
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
                
                <div className="relative z-10">
                  <div className="text-3xl mb-3">{mode.icon}</div>
                  <div className={`font-semibold text-lg mb-1 ${mode.active ? 'text-white' : 'text-white/90'}`}>
                    {mode.title}
                  </div>
                  <div className={`text-sm ${mode.active ? 'text-white/80' : 'text-white/50'}`}>
                    {mode.desc}
                  </div>
                </div>

                {/* Active Indicator */}
                {mode.active && (
                  <motion.div 
                    layoutId="activeMode"
                    className="absolute top-3 right-3 w-3 h-3 bg-indigo-400 rounded-full shadow-lg shadow-indigo-500/50"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Text-to-Video Mode Content */}
          {formData.isTextToVideo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 space-y-6"
            >
              {/* Prompt Input */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                  <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">💭</span>
                  Describe Your Video
                </label>
                <div className="relative">
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
                        console.log('Clipboard access not available');
                      }
                    }}
                    className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white placeholder-white/30 transition-all resize-none"
                    rows={4}
                    placeholder="Enter a detailed description of the video you want to create..."
                    required={formData.isTextToVideo}
                  />
                  <div className="absolute bottom-4 right-4 text-white/30 text-sm">
                    {formData.prompt?.length || 0} chars
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                  <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm">🖼️</span>
                  Upload Images (Optional)
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-indigo-500/50 transition-colors group cursor-pointer relative overflow-hidden">
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
                    className="cursor-pointer flex flex-col items-center justify-center relative z-10"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mb-3"></div>
                        <p className="text-white/70">Uploading images...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <p className="text-white font-medium text-lg mb-1">Click to upload images</p>
                        <p className="text-white/40 text-sm">PNG, JPG, GIF up to 10MB</p>
                      </>
                    )}
                  </label>
                  
                  {/* Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Image Previews */}
                {previews.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <h3 className="text-sm font-medium text-white/70 mb-3">Uploaded Images</h3>
                    <div className="flex flex-wrap gap-3">
                      {previews.map((preview, index) => (
                        <motion.div 
                          key={index} 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group"
                        >
                          <img 
                            src={preview} 
                            alt={`Preview ${index}`} 
                            className="w-24 h-24 object-cover rounded-xl border border-white/10 group-hover:border-indigo-500/50 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            ×
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Standard Mode Content */}
          {!formData.isTextToVideo && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8"
            >
              <div>
                <label className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">🎯</span>
                  Select Niche
                </label>
                <select
                  value={formData.niche}
                  onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white transition-all appearance-none cursor-pointer"
                  required={!formData.isTextToVideo}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5rem' }}
                >
                  <option value="" className="bg-surface-900">Choose a niche...</option>
                  {niches.map(niche => (
                    <option key={niche} value={niche} className="bg-surface-900">{niche}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Voice & Language Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-premium"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-xl">
              🎙️
            </div>
            <h2 className="text-2xl font-bold text-white">Voice & Language</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Language Selection */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-3 block">Voiceover Language</label>
              <div className="grid grid-cols-2 gap-2">
                {languages.map(lang => (
                  <motion.button
                    key={lang.code}
                    type="button"
                    onClick={() => setFormData({ ...formData, language: lang.code })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                      formData.language === lang.code 
                        ? 'border-indigo-500 bg-indigo-500/20 text-white' 
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="text-sm font-medium text-white/70 mb-3 block">Voice Actor</label>
              <div className="grid grid-cols-2 gap-2">
                {voiceOptions.map(voice => (
                  <motion.button
                    key={voice.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, voiceName: voice.id })}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                      formData.voiceName === voice.id 
                        ? 'border-indigo-500 bg-indigo-500/20 text-white' 
                        : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl">{voice.gender === 'MALE' ? '👨' : '👩'}</span>
                    <span className="text-sm font-medium">{voice.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Speaking Rate Slider */}
          <div className="mt-8">
            <label className="flex items-center justify-between text-sm font-medium text-white/70 mb-4">
              <span>Speaking Rate</span>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-bold">
                {formData.speakingRate}x
              </span>
            </label>
            <div className="relative">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={formData.speakingRate}
                onChange={(e) => setFormData({ ...formData, speakingRate: parseFloat(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-white/40 mt-2">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Duration & Visual Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-premium"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl">
              ⚡
            </div>
            <h2 className="text-2xl font-bold text-white">Duration & Style</h2>
          </div>

          {/* Duration Selection */}
          <div className="mb-8">
            <label className="text-sm font-medium text-white/70 mb-3 block">Video Duration</label>
            <div className="flex gap-4">
              {[
                { value: 30, label: '30 Seconds', desc: 'Quick & punchy', icon: '⚡' },
                { value: 60, label: '60 Seconds', desc: 'More detailed', icon: '📊' }
              ].map(option => (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, duration: option.value as 30 | 60 })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 p-5 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                    formData.duration === option.value 
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/20 to-purple-500/20' 
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className={`font-semibold text-lg ${formData.duration === option.value ? 'text-white' : 'text-white/90'}`}>
                      {option.label}
                    </div>
                    <div className={`text-sm ${formData.duration === option.value ? 'text-white/70' : 'text-white/50'}`}>
                      {option.desc}
                    </div>
                  </div>
                  {formData.duration === option.value && (
                    <motion.div 
                      layoutId="durationIndicator"
                      className="absolute top-3 right-3 w-3 h-3 bg-indigo-400 rounded-full"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Visual Style Selection */}
          <div>
            <label className="text-sm font-medium text-white/70 mb-3 block">Visual Style</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visualStyles.map(style => (
                <motion.button
                  key={style.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, visualStyle: style.id })}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${
                    formData.visualStyle === style.id 
                      ? `border-${style.color}-500 bg-gradient-to-br ${style.gradient}` 
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{style.icon}</span>
                      <span className={`font-semibold ${formData.visualStyle === style.id ? 'text-white' : 'text-white/90'}`}>
                        {style.name}
                      </span>
                    </div>
                    <div className={`text-sm ${formData.visualStyle === style.id ? 'text-white/70' : 'text-white/50'}`}>
                      {style.description}
                    </div>
                  </div>
                  
                  {/* Hover Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-50 transition-opacity`} />
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* AI Provider Settings */}
        {providers && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-premium"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl">
                🤖
              </div>
              <h2 className="text-2xl font-bold text-white">AI Provider Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Script Provider */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70 block">Script Generation</label>
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  {providers.script?.map((provider: any) => (
                    <option key={provider.id} value={provider.id} disabled={!provider.available} className="bg-surface-900">
                      {provider.name} {!provider.available && '(Unavailable)'}
                    </option>
                  ))}
                </select>
                {formData.scriptProvider && providers.script?.find((p: any) => p.id === formData.scriptProvider)?.models && (
                  <select
                    value={formData.scriptModel || ''}
                    onChange={(e) => setFormData({ ...formData, scriptModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  >
                    {providers.script?.find((p: any) => p.id === formData.scriptProvider)?.models.map((model: any) => (
                      <option key={model.id} value={model.id} className="bg-surface-900">{model.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Image Provider */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70 block">Image Generation</label>
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  {providers.image?.map((provider: any) => (
                    <option key={provider.id} value={provider.id} disabled={!provider.available} className="bg-surface-900">
                      {provider.name} {!provider.available && '(Unavailable)'}
                    </option>
                  ))}
                </select>
                
                {formData.imageProvider && providers.image?.find((p: any) => p.id === formData.imageProvider)?.models && (
                  <select
                    value={formData.imageModel || ''}
                    onChange={(e) => setFormData({ ...formData, imageModel: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  >
                    {providers.image?.find((p: any) => p.id === formData.imageProvider)?.models.map((model: any) => (
                      <option key={model.id} value={model.id} className="bg-surface-900">{model.name}</option>
                    ))}
                  </select>
                )}
                
                {/* Provider Info Badges */}
                <div className="flex flex-wrap gap-2">
                  {formData.imageProvider === 'craiyon' && (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                      ✓ 100% Free
                    </span>
                  )}
                  {formData.imageProvider === 'deepai' && (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                      ✓ Free tier
                    </span>
                  )}
                  {formData.imageProvider === 'pollinations' && (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                      ✓ Unlimited
                    </span>
                  )}
                  {formData.imageProvider === 'leonardo' && (
                    <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                      🪙 150/day
                    </span>
                  )}
                </div>
              </div>

              {/* TTS Provider */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white/70 block">Voice/TTS</label>
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
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                >
                  {providers.tts?.map((provider: any) => (
                    <option key={provider.id} value={provider.id} disabled={!provider.available} className="bg-surface-900">
                      {provider.name} {!provider.available && '(Unavailable)'}
                    </option>
                  ))}
                </select>
                
                {formData.ttsProvider && providers.tts?.find((p: any) => p.id === formData.ttsProvider)?.models && (
                  <select
                    value={formData.ttsModel || ''}
                    onChange={(e) => setFormData({ ...formData, ttsModel: e.target.value, voiceName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.3)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                  >
                    {providers.tts?.find((p: any) => p.id === formData.ttsProvider)?.models.map((model: any) => (
                      <option key={model.id} value={model.id} className="bg-surface-900">{model.name}</option>
                    ))}
                  </select>
                )}
                
                {formData.ttsProvider === 'edge-tts' && (
                  <span className="inline-block px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
                    ✓ 100% Free - Microsoft Edge
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Media Options */}
        {!formData.isTextToVideo && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card-premium"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl">
                🖼️
              </div>
              <h2 className="text-2xl font-bold text-white">Media Options</h2>
            </div>
            
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer group"
              onClick={() => setFormData({ ...formData, generateImages: !formData.generateImages })}
            >
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                formData.generateImages 
                  ? 'bg-indigo-500 border-indigo-500' 
                  : 'border-white/30 group-hover:border-white/50'
              }`}>
                {formData.generateImages && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white text-lg mb-1">Generate AI Background Images</div>
                <div className="text-white/50">
                  {formData.generateImages 
                    ? '✨ AI will generate unique background images for each scene'
                    : '📷 Use default background (faster generation)'}
                </div>
              </div>
              <div className={`text-3xl transition-transform ${formData.generateImages ? 'scale-110' : 'scale-100'}`}>
                {formData.generateImages ? '✨' : '📷'}
              </div>
            </div>
          </motion.div>
        )}

        {/* Generate Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center gap-4 pt-4"
        >
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
              className={`px-8 py-4 rounded-2xl font-semibold text-lg transition-all ${
                !formData.prompt
                  ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 border border-white/10'
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
            className={`relative px-10 py-4 rounded-2xl font-bold text-lg transition-all overflow-hidden ${
              isGenerating || (formData.isTextToVideo && !formData.prompt)
                ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' 
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 border border-white/20'
            }`}
          >
            {/* Animated Background */}
            {!isGenerating && !(formData.isTextToVideo && !formData.prompt) && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-gradient-x opacity-0 hover:opacity-100 transition-opacity" />
            )}
            
            <span className="relative z-10 flex items-center gap-3">
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Generate Video
                </>
              )}
            </span>
          </motion.button>
        </motion.div>
      </form>
    </motion.div>
  );
};

export default VideoCreation;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const niches = [
  { id: 'motivation', name: 'Motivation & Self-Help', icon: '💪', color: 'from-yellow-400 to-orange-500' },
  { id: 'technology', name: 'Technology & AI', icon: '🤖', color: 'from-blue-400 to-cyan-500' },
  { id: 'history', name: 'History & Facts', icon: '📚', color: 'from-amber-600 to-yellow-600' },
  { id: 'science', name: 'Science & Discovery', icon: '🔬', color: 'from-purple-400 to-pink-500' },
  { id: 'business', name: 'Business & Finance', icon: '💰', color: 'from-green-400 to-emerald-600' },
  { id: 'health', name: 'Health & Wellness', icon: '🏃', color: 'from-red-400 to-pink-500' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: 'from-purple-500 to-indigo-600' },
  { id: 'gaming', name: 'Gaming & Esports', icon: '🎮', color: 'from-violet-500 to-purple-600' },
  { id: 'education', name: 'Education & Learning', icon: '📖', color: 'from-teal-400 to-cyan-500' },
  { id: 'lifestyle', name: 'Lifestyle & DIY', icon: '🏠', color: 'from-warm-gray-400 to-stone-500' },
];

const tones = [
  { id: 'educational', name: '📚 Educational', description: 'Informative and authoritative' },
  { id: 'entertaining', name: '🎭 Entertaining', description: 'Fun and engaging' },
  { id: 'motivational', name: '🚀 Motivational', description: 'Inspiring and uplifting' },
  { id: 'controversial', name: '🔥 Controversial', description: 'Attention-grabbing' },
  { id: 'informative', name: 'ℹ️ Informative', description: 'Clear and concise' },
];

const lengths = [
  { id: 'short', name: '⚡ Short', description: '30-45 seconds', wordCount: '150-250 words' },
  { id: 'medium', name: '🎯 Medium', description: '1-2 minutes', wordCount: '300-500 words' },
  { id: 'long', name: '📝 Long', description: '3-5 minutes', wordCount: '600-900 words' },
];

interface GeneratedScript {
  title: string;
  sections: {
    hook: string;
    mainContent: string;
    callToAction: string;
  };
  hashtags: string[];
  estimatedDuration: number;
}

const TopicToScript: React.FC = () => {
  const [selectedNiche, setSelectedNiche] = useState<string>('motivation');
  const [topic, setTopic] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<string>('educational');
  const [selectedLength, setSelectedLength] = useState<string>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);

  useEffect(() => {
    fetchSuggestedTopics();
  }, [selectedNiche]);

  const fetchSuggestedTopics = async () => {
    try {
      const response = await fetch(`/api/topic/suggestions?niche=${selectedNiche}&count=5`);
      const data = await response.json();
      if (data.success && data.data?.topics) {
        setSuggestedTopics(data.data.topics);
      }
    } catch (err) {
      console.error('Failed to fetch suggested topics:', err);
    }
  };

  const generateScript = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedScript(null);

    try {
      const response = await fetch('/api/topic/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          niche: selectedNiche,
          tone: selectedTone,
          length: selectedLength,
          language: 'en-US',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate script');
      }

      setGeneratedScript(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const useSuggestedTopic = (suggestedTopic: string) => {
    setTopic(suggestedTopic);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const createVideoFromScript = () => {
    if (!generatedScript) return;
    
    // Store the script in localStorage for the video creation page
    localStorage.setItem('generatedScript', JSON.stringify(generatedScript));
    localStorage.setItem('scriptTopic', topic);
    
    // Navigate to video creation
    window.location.href = '/create';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🎬 AI Script Generator
          </h1>
          <p className="text-gray-400">
            Turn any topic into a viral-ready video script in seconds
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700"
          >
            {/* Niche Selection */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                Select Your Niche
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {niches.map((niche) => (
                  <button
                    key={niche.id}
                    onClick={() => setSelectedNiche(niche.id)}
                    className={`p-3 rounded-xl text-left transition-all duration-300 ${
                      selectedNiche === niche.id
                        ? `bg-gradient-to-r ${niche.color} text-white shadow-lg scale-105`
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-2xl">{niche.icon}</span>
                    <span className="block text-sm font-medium mt-1">{niche.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Input */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                Your Topic or Idea
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Why Morning Routines Are Overrated"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              
              {/* Suggested Topics */}
              {suggestedTopics.length > 0 && (
                <div className="mt-3">
                  <p className="text-gray-400 text-sm mb-2">💡 Try these topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTopics.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => useSuggestedTopic(suggestion)}
                        className="px-3 py-1 bg-gray-700/50 text-gray-300 text-sm rounded-full hover:bg-gray-600 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tone Selection */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                Content Tone
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      selectedTone === tone.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="font-medium">{tone.name}</span>
                    <p className="text-xs opacity-70 mt-1">{tone.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Length Selection */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-3">
                Video Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {lengths.map((length) => (
                  <button
                    key={length.id}
                    onClick={() => setSelectedLength(length.id)}
                    className={`p-3 rounded-xl text-center transition-all ${
                      selectedLength === length.id
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <span className="font-medium">{length.name}</span>
                    <p className="text-xs opacity-70 mt-1">{length.description}</p>
                    <p className="text-xs opacity-50">{length.wordCount}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateScript}
              disabled={isGenerating || !topic.trim()}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                isGenerating || !topic.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02]'
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating Script...
                </span>
              ) : (
                '✨ Generate Script'
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-400">{error}</p>
              </div>
            )}
          </motion.div>

          {/* Right Panel - Generated Script */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700"
          >
            {generatedScript ? (
              <div className="h-full flex flex-col">
                {/* Script Header */}
                <div className="mb-4 pb-4 border-b border-gray-600">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {generatedScript.title}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>⏱️ {Math.round(generatedScript.estimatedDuration / 60)} min</span>
                    <span>📝 {generatedScript.sections.mainContent.split(' ').length} words</span>
                  </div>
                </div>

                {/* Script Sections */}
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* Hook */}
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-yellow-400 font-medium">🎣 Hook</h3>
                      <button
                        onClick={() => copyToClipboard(generatedScript.sections.hook)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-white">{generatedScript.sections.hook}</p>
                  </div>

                  {/* Main Content */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-blue-400 font-medium">📖 Main Content</h3>
                      <button
                        onClick={() => copyToClipboard(generatedScript.sections.mainContent)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-white whitespace-pre-wrap">{generatedScript.sections.mainContent}</p>
                  </div>

                  {/* Call to Action */}
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-green-400 font-medium">📢 Call to Action</h3>
                      <button
                        onClick={() => copyToClipboard(generatedScript.sections.callToAction)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-white">{generatedScript.sections.callToAction}</p>
                  </div>

                  {/* Hashtags */}
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                    <h3 className="text-purple-400 font-medium mb-2">🏷️ Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                      {generatedScript.hashtags.map((hashtag, index) => (
                        <span key={index} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-lg">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-4 border-t border-gray-600 flex gap-3">
                  <button
                    onClick={createVideoFromScript}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    🎬 Create Video
                  </button>
                  <button
                    onClick={() => copyToClipboard(
                      `${generatedScript.sections.hook}\n\n${generatedScript.sections.mainContent}\n\n${generatedScript.sections.callToAction}\n\n${generatedScript.hashtags.join(' ')}`
                    )}
                    className="px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all"
                  >
                    📋 Copy All
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    Your Script Will Appear Here
                  </h3>
                  <p className="text-gray-400 max-w-sm">
                    Enter a topic, select your preferences, and click generate to create a viral-ready video script
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-white font-semibold mb-2">Viral-Ready Content</h3>
            <p className="text-gray-400 text-sm">
              Scripts optimized for maximum engagement, with attention-grabbing hooks and compelling CTAs
            </p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-3">🌍</div>
            <h3 className="text-white font-semibold mb-2">Multi-Language</h3>
            <p className="text-gray-400 text-sm">
              Generate scripts in 140+ languages with culturally relevant content
            </p>
          </div>
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-white font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400 text-sm">
              Get a complete, production-ready script in under 30 seconds
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TopicToScript;

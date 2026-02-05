import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { videoAPI } from '../../api/videos';

interface AIVideoProvider {
  id: string;
  name: string;
  description: string;
  requiresKey: boolean;
  available: boolean;
  pricing: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    type: string;
  }>;
}

const AIVideoGeneration = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<AIVideoProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('bytez');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const response = await videoAPI.getAIVideoProviders();
      if (response.success) {
        setProviders(response.providers);
        if (response.providers.length > 0) {
          setSelectedProvider(response.providers[0].id);
          setSelectedModel(response.providers[0].models[0]?.id || '');
        }
      }
    } catch (err: any) {
      setError('Failed to load providers');
      console.error('Error fetching providers:', err);
    }
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await videoAPI.generateAIVideo({
        prompt: prompt.trim(),
        provider: selectedProvider as 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels',
        model: selectedModel,
        duration,
      });

      setResult(response);

      if (response.status === 'success' && response.videoUrl) {
        console.log('✅ Video generated successfully:', response.videoUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate video');
      console.error('Error generating video:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestProvider = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await videoAPI.testAIVideoProvider(selectedProvider as 'bytez' | 'fal' | 'replicate' | 'heygen' | 'skyreels');
      setResult(response);
      if (response.success) {
        console.log('✅ Provider test successful');
      }
    } catch (err: any) {
      setError(err.message || 'Provider test failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-h1 font-heading">AI Video Generation</h1>
          <p className="text-gray-500 mt-1">Generate videos from text using state-of-the-art AI models</p>
        </div>
        <button
          onClick={() => navigate('/create')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          ← Back to Video Creation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {providers.map(provider => (
          <button
            key={provider.id}
            onClick={() => {
              setSelectedProvider(provider.id);
              setSelectedModel(provider.models[0]?.id || '');
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedProvider === provider.id
                ? 'border-primary-blue bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{provider.name}</span>
              {provider.available ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Available</span>
              ) : (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Not Configured</span>
              )}
            </div>
            <p className="text-sm text-gray-600">{provider.description}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                provider.models[0]?.type === 'free'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {provider.pricing}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-h2 font-heading mb-6">Video Settings</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">AI Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
            disabled={isGenerating}
          >
            {currentProvider?.models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.description}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Video Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
            rows={4}
            placeholder="Describe the video you want to generate...&#10;&#10;Example: A cat walking through a garden with butterflies, cinematic lighting, high quality"
            disabled={isGenerating}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Duration: {duration} seconds</label>
          <input
            type="range"
            min="3"
            max="10"
            step="1"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full"
            disabled={isGenerating}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>3s (Quick)</span>
            <span>5s (Standard)</span>
            <span>10s (Long)</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="font-semibold text-green-800 mb-2">Result</h3>
            <p className="text-sm text-green-700">
              Status: <strong>{result.status}</strong>
            </p>
            {result.requestId && (
              <p className="text-sm text-green-700">
                Request ID: <code className="bg-green-100 px-1 rounded">{result.requestId}</code>
              </p>
            )}
            {result.videoUrl && (
              <div className="mt-3">
                <p className="text-sm font-medium text-green-800 mb-1">Generated Video:</p>
                <video
                  src={result.videoUrl}
                  controls
                  className="w-full max-h-64 rounded-lg"
                />
                <a
                  href={result.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 underline mt-2 inline-block"
                >
                  Open Video →
                </a>
              </div>
            )}
            {result.error && (
              <p className="text-sm text-red-700 mt-2">Error: {result.error}</p>
            )}
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={handleTestProvider}
            disabled={isGenerating || !currentProvider?.available}
            className={`px-6 py-3 rounded-full text-button font-semibold transition-all ${
              isGenerating || !currentProvider?.available
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🧪 Test Provider
          </button>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || !currentProvider?.available}
            className={`px-8 py-4 rounded-full text-button font-semibold transition-all flex items-center ${
              isGenerating || !prompt.trim() || !currentProvider?.available
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
              '🎬 Generate Video'
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-blue-800 mb-3">💡 Tips for Best Results</h3>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• Be specific about the scene, lighting, and mood</li>
          <li>• Mention camera movements (pan, zoom, tracking)</li>
          <li>• Include style references (cinematic, documentary, animated)</li>
          <li>• For free providers (Bytez), results may take 30-60 seconds</li>
          <li>• For paid providers (FAL, Replicate), expect higher quality but costs apply</li>
        </ul>
      </div>

      <div className="mt-6 bg-yellow-50 rounded-xl p-6">
        <h3 className="font-semibold text-yellow-800 mb-3">📊 Provider Comparison</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-yellow-700">
              <th className="pb-2">Provider</th>
              <th className="pb-2">Price</th>
              <th className="pb-2">Quality</th>
              <th className="pb-2">Speed</th>
              <th className="pb-2">Max Duration</th>
            </tr>
          </thead>
          <tbody className="text-yellow-700">
            <tr>
              <td className="py-1">Bytez (ModelScope)</td>
              <td>Free</td>
              <td>Good</td>
              <td>Fast</td>
              <td>~10s</td>
            </tr>
            <tr>
              <td className="py-1">Bytez (ZeroScope)</td>
              <td>Free</td>
              <td>Basic</td>
              <td>Fast</td>
              <td>~5s</td>
            </tr>
            <tr>
              <td className="py-1">FAL (Mochi 1)</td>
              <td>~$0.04/sec</td>
              <td>Excellent</td>
              <td>Medium</td>
              <td>~4s</td>
            </tr>
            <tr>
              <td className="py-1">FAL (LTX Video)</td>
              <td>~$0.04/sec</td>
              <td>Excellent</td>
              <td>Medium</td>
              <td>~10s</td>
            </tr>
            <tr>
              <td className="py-1">Replicate (CogVideo)</td>
              <td>~$0.0028/run</td>
              <td>Good</td>
              <td>Slow</td>
              <td>~4s</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default AIVideoGeneration;

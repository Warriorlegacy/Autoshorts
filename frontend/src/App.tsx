import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Dashboard from './screens/Dashboard/Dashboard';
import VideoCreation from './screens/VideoCreation/VideoCreation';
import VideoReview from './screens/VideoReview/VideoReview';
import Library from './screens/Library/Library';
import Queue from './screens/Queue/Queue';
import Settings from './screens/Settings/Settings';
import AvatarCreation from './screens/AvatarCreation/AvatarCreation';
import TopicToScript from './screens/TopicToScript/TopicToScript';
import AIVideoGeneration from './screens/AIVideoGeneration/AIVideoGeneration';
import OAuthCallback from './pages/OAuthCallback';
import Layout from './components/common/Layout';

const Landing = () => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name);
      }
    } catch (err) {
      // Error is handled in auth store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-blue to-secondary-purple flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          {/* AutoShorts Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary-blue to-secondary-purple rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-h2 font-heading text-gray-900 mb-2">AutoShorts</h1>
          <p className="text-gray-500">AI Video Generator & Scheduler</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
              required={!isLogin}
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-blue focus:outline-none"
            required
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-blue text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-blue-dark transition-all disabled:bg-gray-300 shadow-lg mt-6"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary-blue hover:underline"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!isAuthenticated ? <Landing /> : <Navigate to="/dashboard" />} />
        <Route path="/auth/callback/*" element={<OAuthCallback />} />

        {/* Protected Routes */}
          <Route element={isAuthenticated ? <Layout /> : <Navigate to="/" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create" element={<VideoCreation />} />
          <Route path="/create/script" element={<TopicToScript />} />
          <Route path="/create/avatar" element={<AvatarCreation />} />
          <Route path="/create/ai-video" element={<AIVideoGeneration />} />
          <Route path="/review/:videoId" element={<VideoReview />} />
          <Route path="/library" element={<Library />} />
          <Route path="/queue" element={<Queue />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

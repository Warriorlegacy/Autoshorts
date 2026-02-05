import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Landing from './Landing';
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
import { motion, AnimatePresence } from 'framer-motion';

const AuthModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        onClose();
      } else {
        await register(formData.email, formData.password, formData.name);
        onClose();
      }
    } catch (err) {
      // Error is handled in auth store
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
          >
            <div className="bg-surface-900 border border-white/10 rounded-3xl p-8 max-w-md w-full pointer-events-auto shadow-2xl">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-purple rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
                    <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-white/50">
                  {isLogin ? 'Sign in to continue creating' : 'Start your viral journey today'}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      required={!isLogin}
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary mt-6"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                  className="text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function App() {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <BrowserRouter>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/" 
          element={
            !isAuthenticated ? (
              <Landing onLoginClick={() => setShowAuthModal(true)} />
            ) : (
              <Navigate to="/dashboard" />
            )
          } 
        />
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

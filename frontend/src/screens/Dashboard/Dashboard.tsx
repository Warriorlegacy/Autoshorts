import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useVideoStore } from '../../store/videoStore';

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  userId: string;
  connectedAt: string;
  updatedAt: string;
}

const niches = [
  { id: 'scary_stories', name: 'Scary Stories', icon: '👻', color: 'from-purple-600 to-indigo-600' },
  { id: 'true_crime', name: 'True Crime', icon: '🔍', color: 'from-red-600 to-orange-600' },
  { id: 'real_tragedies', name: 'Real Tragedies', icon: '😢', color: 'from-gray-600 to-gray-800' },
  { id: 'anime_stories', name: 'Anime Stories', icon: '🎌', color: 'from-pink-500 to-purple-500' },
  { id: 'heists', name: 'Heists', icon: '💰', color: 'from-green-600 to-emerald-600' },
  { id: 'history', name: 'History', icon: '📚', color: 'from-amber-600 to-yellow-600' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { } = useAuth();
  const { videos, queuedVideos, fetchVideos, fetchQueuedVideos, isLoading: videosLoading } = useVideoStore();

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

  const fetchConnectedAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/connected-accounts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectedAccounts(data.connectedAccounts || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch connected accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchQueuedVideos();
    fetchConnectedAccounts();
  }, [fetchVideos, fetchQueuedVideos]);

  const isLoading = videosLoading || accountsLoading;

  const totalVideos = videos.length;
  const queuedCount = queuedVideos.length;
  const completedCount = videos.filter(v => v.status === 'completed').length;

  return (
    <div className="space-y-8">
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">Create viral faceless videos on auto-pilot</h1>
          <p className="text-white/80 text-lg mb-6">The only AI that generates & posts videos for you automatically, even while you sleep.</p>

          <div className="flex flex-wrap gap-3 mb-6">
            {niches.slice(0, 4).map((niche) => (
              <span key={niche.id} className="px-4 py-2 bg-white/20 rounded-full text-sm">
                {niche.icon} {niche.name}
              </span>
            ))}
          </div>

          <button
            onClick={() => navigate('/create')}
            className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/90 transition-all shadow-lg"
          >
            Create Your First Video
          </button>
        </div>

        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 hidden lg:block">
          <div className="text-right">
            <div className="text-5xl font-bold">344K+</div>
            <div className="text-white/80">Trusted by creators</div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="text-4xl font-bold text-blue-600">{totalVideos}</div>
          <div className="text-gray-500">Videos Created</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="text-4xl font-bold text-purple-600">{queuedCount}</div>
          <div className="text-gray-500">In Queue</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="text-4xl font-bold text-green-600">{completedCount}</div>
          <div className="text-gray-500">Posted</div>
        </motion.div>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-6">Popular Niches</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {niches.map((niche, index) => (
            <motion.button
              key={niche.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => navigate('/create')}
              className={`p-4 rounded-2xl bg-gradient-to-br ${niche.color} text-white text-center hover:shadow-lg transition-all`}
            >
              <div className="text-3xl mb-2">{niche.icon}</div>
              <div className="font-semibold text-sm">{niche.name}</div>
            </motion.button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Connected Accounts</h2>
          <button
            onClick={() => navigate('/settings')}
            className="text-blue-600 font-semibold hover:underline"
          >
            Manage All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">📺</div>
                <div>
                  <div className="font-semibold">YouTube</div>
                  <div className="text-sm text-gray-500">
                    {connectedAccounts.some(a => a.platform === 'youtube') ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {connectedAccounts.some(a => a.platform === 'youtube') ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center text-2xl">📸</div>
                <div>
                  <div className="font-semibold">Instagram</div>
                  <div className="text-sm text-gray-500">
                    {connectedAccounts.some(a => a.platform === 'instagram') ? 'Connected' : 'Not connected'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="px-4 py-2 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {connectedAccounts.some(a => a.platform === 'instagram') ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {queuedVideos.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Scheduled Posts</h2>
            <button
              onClick={() => navigate('/queue')}
              className="text-blue-600 font-semibold hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {queuedVideos.slice(0, 3).map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                  </div>
                  <div>
                    <div className="font-medium">{video.title}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(video.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {video.platforms.map((p) => (
                    <span key={p} className="text-lg">
                      {p === 'youtube' ? '📺' : '📸'}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white"
          >
            <div className="text-4xl mb-4">1</div>
            <h3 className="text-xl font-bold mb-2">Create a Series</h3>
            <p className="text-white/80">Choose your niche and video formats. Our AI handles the rest.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white"
          >
            <div className="text-4xl mb-4">2</div>
            <h3 className="text-xl font-bold mb-2">Customize</h3>
            <p className="text-white/80">Pick art styles and add your favorite music.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white"
          >
            <div className="text-4xl mb-4">3</div>
            <h3 className="text-xl font-bold mb-2">Watch Your Growth</h3>
            <p className="text-white/80">Connect accounts and let us handle the posting.</p>
          </motion.div>
        </div>
      </section>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/create')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl z-20"
      >
        +
      </motion.button>
    </div>
  );
};

export default Dashboard;

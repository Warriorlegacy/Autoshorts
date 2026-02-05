import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVideoStore } from '../../store/videoStore';
import { 
  Video, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Plus, 
  Youtube, 
  Instagram,
  Sparkles,
  Zap,
  ArrowRight
} from 'lucide-react';

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  userId: string;
  connectedAt: string;
  updatedAt: string;
}

const niches = [
  { id: 'scary_stories', name: 'Scary Stories', icon: '👻', color: 'from-purple-600 to-indigo-600', count: '2.4M views' },
  { id: 'true_crime', name: 'True Crime', icon: '🔍', color: 'from-red-600 to-orange-600', count: '1.8M views' },
  { id: 'real_tragedies', name: 'Real Tragedies', icon: '😢', color: 'from-gray-600 to-gray-800', count: '3.2M views' },
  { id: 'anime_stories', name: 'Anime Stories', icon: '🎌', color: 'from-pink-500 to-purple-500', count: '4.1M views' },
  { id: 'heists', name: 'Heists', icon: '💰', color: 'from-green-600 to-emerald-600', count: '1.5M views' },
  { id: 'history', name: 'History', icon: '📚', color: 'from-amber-600 to-yellow-600', count: '2.9M views' },
];

const StatCard = ({ icon: Icon, value, label, trend, gradient }: { 
  icon: any; 
  value: string | number; 
  label: string; 
  trend?: string;
  gradient: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card-premium group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-glow`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {trend}
        </span>
      )}
    </div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-white/50 text-sm">{label}</div>
  </motion.div>
);

const NicheCard = ({ niche, index }: { niche: typeof niches[0]; index: number }) => (
  <motion.button
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ scale: 1.02, y: -4 }}
    whileTap={{ scale: 0.98 }}
    className="group relative overflow-hidden rounded-2xl p-6 text-left"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${niche.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
    <div className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl" />
    <div className="relative z-10">
      <div className="text-4xl mb-3">{niche.icon}</div>
      <div className="font-semibold text-white mb-1">{niche.name}</div>
      <div className="text-sm text-white/40">{niche.count}</div>
    </div>
    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <Plus className="w-4 h-4 text-white" />
      </div>
    </div>
  </motion.button>
);

const ConnectedPlatform = ({ 
  platform, 
  icon: Icon, 
  color, 
  isConnected 
}: { 
  platform: string; 
  icon: any; 
  color: string;
  isConnected: boolean;
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="card-premium flex items-center justify-between"
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="font-semibold text-white">{platform}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-white/20'}`} />
          <span className={isConnected ? 'text-emerald-400' : 'text-white/40'}>
            {isConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </div>
    </div>
    <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all">
      {isConnected ? 'Manage' : 'Connect'}
    </button>
  </motion.div>
);

const RecentVideo = ({ video }: { video: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
  >
    <div className="w-20 h-12 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-purple/20 flex items-center justify-center overflow-hidden">
      <Video className="w-6 h-6 text-white/40" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-white truncate">{video.title}</div>
      <div className="text-sm text-white/40">
        {new Date(video.createdAt).toLocaleDateString()}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {video.platforms?.map((p: string) => (
        <span key={p} className="text-lg">
          {p === 'youtube' ? '📺' : '📸'}
        </span>
      ))}
    </div>
    <ArrowRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
  </motion.div>
);

const QuickAction = ({ icon: Icon, title, description, onClick }: { icon: any; title: string; description: string; onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group text-left p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 transition-all"
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-purple flex items-center justify-center mb-4 shadow-glow group-hover:shadow-glow-lg transition-shadow">
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="font-semibold text-white mb-2">{title}</h3>
    <p className="text-sm text-white/50">{description}</p>
  </motion.button>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { videos, queuedVideos, fetchVideos, fetchQueuedVideos } = useVideoStore();

  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);

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
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchQueuedVideos();
    fetchConnectedAccounts();
  }, [fetchVideos, fetchQueuedVideos]);

  const totalVideos = videos.length;
  const queuedCount = queuedVideos.length;
  const completedCount = videos.filter(v => v.status === 'completed').length;

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-white/50">Welcome back! Ready to create something amazing?</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/create')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Video
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={Video} 
          value={totalVideos} 
          label="Videos Created" 
          trend="+12%"
          gradient="from-primary-500 to-primary-600"
        />
        <StatCard 
          icon={Calendar} 
          value={queuedCount} 
          label="Scheduled" 
          trend="+5"
          gradient="from-accent-purple to-accent-pink"
        />
        <StatCard 
          icon={Zap} 
          value={completedCount} 
          label="Published" 
          trend="+8%"
          gradient="from-accent-emerald to-accent-cyan"
        />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            icon={Sparkles}
            title="AI Video"
            description="Generate a video with AI"
            onClick={() => navigate('/create/ai-video')}
          />
          <QuickAction
            icon={Video}
            title="From Script"
            description="Create from your script"
            onClick={() => navigate('/create/script')}
          />
          <QuickAction
            icon={Clock}
            title="Schedule"
            description="Manage your queue"
            onClick={() => navigate('/queue')}
          />
        </div>
      </section>

      {/* Popular Niches */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Popular Niches</h2>
          <button 
            onClick={() => navigate('/create')}
            className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {niches.map((niche, index) => (
            <NicheCard key={niche.id} niche={niche} index={index} />
          ))}
        </div>
      </section>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Connected Platforms */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Connected Platforms</h2>
            <button className="text-primary-400 hover:text-primary-300 text-sm font-medium">
              Manage All
            </button>
          </div>
          <div className="space-y-4">
            <ConnectedPlatform
              platform="YouTube"
              icon={Youtube}
              color="bg-red-500"
              isConnected={connectedAccounts.some(a => a.platform === 'youtube')}
            />
            <ConnectedPlatform
              platform="Instagram"
              icon={Instagram}
              color="bg-gradient-to-br from-purple-500 to-pink-500"
              isConnected={connectedAccounts.some(a => a.platform === 'instagram')}
            />
          </div>
        </section>

        {/* Recent Videos */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Recent Videos</h2>
            <button 
              onClick={() => navigate('/library')}
              className="text-primary-400 hover:text-primary-300 text-sm font-medium"
            >
              View Library
            </button>
          </div>
          <div className="space-y-3">
            {videos.slice(0, 5).map((video) => (
              <RecentVideo key={video.id} video={video} />
            ))}
            {videos.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No videos yet. Create your first one!</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/create')}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-primary-500 to-accent-purple text-white rounded-full shadow-glow flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default Dashboard;

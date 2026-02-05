import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Calendar, Settings, Bell, Plus, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const Layout: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: LayoutGrid, label: 'Library', path: '/library' },
    { icon: Calendar, label: 'Queue', path: '/queue' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">AutoShorts</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold">
              US
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-24 pb-24 relative z-10">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/5 px-4 h-16 flex items-center justify-around z-30">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              isActive(item.path) 
                ? 'text-indigo-400' 
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <item.icon size={22} />
            </motion.div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Floating Action Button */}
      {!isActive('/create') && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-20 right-6 z-40"
        >
          <Link
            to="/create"
            className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 transition-all"
            title="Create new video"
          >
            <Plus size={28} />
          </Link>
        </motion.div>
      )}
    </div>
  );
};

export default Layout;

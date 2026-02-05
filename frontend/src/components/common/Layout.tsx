import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Calendar, Settings, Bell, PlusSquare } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/logo.png" alt="AutoShorts" className="h-8 w-auto" />
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden border border-gray-100">
              <img src="https://ui-avatars.com/api/?name=User&background=random" alt="User" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 h-16 flex items-center justify-around z-30">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive(item.path) ? 'text-primary-blue' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Floating Action Button */}
      {!isActive('/create') && (
        <Link
          to="/create"
          className="fixed bottom-20 right-6 w-14 h-14 bg-primary-blue text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
          title="Create new video"
        >
          <PlusSquare size={28} />
        </Link>
      )}
    </div>
  );
};

export default Layout;

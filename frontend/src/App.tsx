import { useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import { useAuthStore } from './store/auth.store';
import ServerList from './components/ServerList';
import ServerDashboard from './components/ServerDashboard';
import DashboardHome from './components/DashboardHome';
import GlobalSettings from './pages/GlobalSettings';
import { Button } from './components/ui/button';
import { Settings, LayoutDashboard, LogOut, Package } from 'lucide-react';
import type { Server } from './types/entities';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

import CustomPlugins from './components/CustomPlugins/CustomPlugins';
import ProfileModal from './components/ProfileModal';

function Dashboard() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isSettingsPage = location.pathname === '/settings';
  const isCustomPluginsPage = location.pathname === '/custom-plugins';

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex font-sans selection:bg-blue-500/30">
      {/* Sidebar Navigation - Fixed Left */}
      <aside className="w-72 bg-[#0F1219] border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => { setSelectedServer(null); navigate('/'); }}
          >
            <img src="/logo.png" alt="Shimatsu Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg tracking-tight">Shimatsu Updater</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar">
          {/* Main Nav */}
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={`w-full justify-start ${!isSettingsPage && !selectedServer ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              onClick={() => { setSelectedServer(null); navigate('/'); }}
            >
              <LayoutDashboard className="w-4 h-4 mr-3" />
              Overview
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${location.pathname === '/custom-plugins' ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              onClick={() => { setSelectedServer(null); navigate('/custom-plugins'); }}
            >
              <Package className="w-4 h-4 mr-3" />
              Custom Plugins
            </Button>
            <Button
              variant="ghost"
              className={`w-full justify-start ${isSettingsPage ? 'bg-blue-600/10 text-blue-400' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              onClick={() => { setSelectedServer(null); navigate('/settings'); }}
            >
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Button>
          </div>

          {/* Server List Component */}
          <div className="pt-4 border-t border-gray-800">
            <ServerList
              onSelectServer={(server) => {
                setSelectedServer(server);
                if (isSettingsPage || isCustomPluginsPage) navigate('/');
              }}
              selectedServerId={selectedServer?.id}
            />
          </div>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-800 bg-[#0c0f16]">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 group w-full text-left hover:bg-gray-800/50 p-2 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold relative overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium group-hover:text-blue-400 transition-colors">{user?.username}</span>
                <span className="text-xs text-gray-500 capitalize">{typeof user?.role === 'string' ? user?.role : (user?.role as any)?.name}</span>
              </div>
            </button>
            <Button variant="ghost" size="icon" onClick={logout} className="text-gray-400 hover:text-red-400 ml-2">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-[10px] text-gray-600 text-center font-mono">
            Coded by <span className="text-blue-500/50">KezzyOfficial</span>
          </div>
        </div>
      </aside>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen bg-[#0B0E14]">
        <div className="p-8 max-w-[1600px] mx-auto">
          {isSettingsPage ? (
            <GlobalSettings />
          ) : isCustomPluginsPage ? (
            <CustomPlugins />
          ) : selectedServer ? (
            <ServerDashboard server={selectedServer} />
          ) : (
            <DashboardHome onSelectServer={setSelectedServer} />
          )}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/custom-plugins"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

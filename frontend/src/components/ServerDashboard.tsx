import React, { useState } from 'react';
import type { Server } from '../types/entities';
import PluginList from './PluginList';
import ScheduleList from './Schedules/ScheduleList';
import Dashboard from './Dashboard/Dashboard';
import Marketplace from './Marketplace/Marketplace';
import { Package, Calendar, LayoutDashboard, Search } from 'lucide-react';

interface ServerDashboardProps {
    server: Server;
}

const ServerDashboard: React.FC<ServerDashboardProps> = ({ server }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'plugins' | 'schedules' | 'marketplace'>('dashboard');

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center gap-1 bg-gray-900/50 p-1 rounded-xl w-fit border border-gray-800">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('plugins')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'plugins'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    <Package className="w-4 h-4" /> Plugins
                </button>
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'schedules'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    <Calendar className="w-4 h-4" /> Schedules
                </button>
                <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'marketplace'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                >
                    <Search className="w-4 h-4" /> Marketplace
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                {activeTab === 'dashboard' && <Dashboard server={server} />}
                {activeTab === 'plugins' && <PluginList server={server} />}
                {activeTab === 'schedules' && <ScheduleList />}
                {activeTab === 'marketplace' && <Marketplace server={server} />}
            </div>
        </div>
    );
};

export default ServerDashboard;

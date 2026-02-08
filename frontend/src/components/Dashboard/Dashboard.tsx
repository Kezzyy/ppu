
import React, { useEffect, useState } from 'react';
import type { Server } from '../../types/entities'; // Changed to type import
import { serverService } from '../../services/api';
import ServerHealthChart from './ServerHealthChart';
import { Activity, Server as ServerIcon, ShieldAlert, Cpu } from 'lucide-react';

interface DashboardProps {
    server: Server;
}

const Dashboard: React.FC<DashboardProps> = ({ server }) => {
    const [healthHistory, setHealthHistory] = useState<any[]>([]);
    // const [loading, setLoading] = useState(true); // Unused for now

    useEffect(() => {
        loadData();
        // Poll every minute for dashboard freshness
        const interval = setInterval(loadData, 60000);
        return () => clearInterval(interval);
    }, [server.id]);

    const loadData = async () => {
        try {
            const history = await serverService.getHealthHistory(server.id);
            setHealthHistory(history);
        } catch (error) {
            console.error('Failed to load health history:', error);
        } finally {
            // setLoading(false);
        }
    };

    // Calculate generic stats
    const currentRam = healthHistory.length > 0 ? healthHistory[0].ram_used : 0;
    const ramMB = Math.round(Number(currentRam) / 1024 / 1024);
    const status = healthHistory.length > 0 ? healthHistory[0].status : server.status;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Status</p>
                        <p className={`text-xl font-bold capitalize ${status === 'running' || status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                            {status}
                        </p>
                    </div>
                    <Activity className={`w-8 h-8 ${status === 'running' || status === 'healthy' ? 'text-green-500/20' : 'text-red-500/20'}`} />
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">RAM Usage</p>
                        <p className="text-xl font-bold text-blue-400">
                            {ramMB} MB
                        </p>
                    </div>
                    <Cpu className="w-8 h-8 text-blue-500/20" />
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Plugins</p>
                        <p className="text-xl font-bold text-purple-400">
                            {/* We don't have plugin count in server object yet, maybe fetch? */}
                            -
                        </p>
                    </div>
                    <ServerIcon className="w-8 h-8 text-purple-500/20" />
                </div>

                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400">Health Check</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {server.last_health_check
                                ? new Date(server.last_health_check).toLocaleTimeString()
                                : 'Never'}
                        </p>
                    </div>
                    <ShieldAlert className="w-8 h-8 text-yellow-500/20" />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ServerHealthChart data={healthHistory} />
                </div>

                {/* Activity Feed Placeholder */}
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 h-64 overflow-hidden">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Server synced just now
                        </div>
                        {healthHistory.length > 0 && (
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Health check completed
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

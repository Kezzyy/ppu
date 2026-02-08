import { useEffect, useState } from 'react';
import { serverService, pluginService } from '../services/api';
import type { Server } from '../types/entities';
import { toast } from 'sonner';
import {
    Server as ServerIcon,
    Package,
    AlertTriangle,
    Activity,
    Zap,
    Settings
} from 'lucide-react';
import { Button } from './ui/button';

export default function DashboardHome({ onSelectServer: _onSelectServer }: { onSelectServer: (server: Server) => void }) {
    const [stats, setStats] = useState({
        totalServers: 0,
        totalPlugins: 0,
        updatesAvailable: 0,
        activeServers: 0
    });
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const serversData = await serverService.getAll();
                setServers(serversData);

                // Calculate stats
                let pluginCount = 0;
                let updateCount = 0;
                let activeCount = 0;

                // We need to fetch plugins for stats, but to avoid spamming, 
                // we might just use what we have or do a lightweight check.
                // For now, let's iterate and fetch strictly necessary data or assume we have some.
                // Since getPlugins is per server, satisfying "Global Stats" accurately 
                // requires iterating all servers (heavy) or a new backend endpoint.
                // Let's implement a "quick" frontend aggregation for now, 
                // but ideally, we should add a /stats endpoint to the backend later.

                // For this MVP, we'll just count servers and active status.
                // Real plugin counts would need a backend aggregation endpoint.
                activeCount = serversData.filter(s => s.status !== 'offline').length;

                // To get real plugin stats without killing the backend, 
                // we'll leave them as 0 or "--" until we make a backend endpoint, 
                // OR we can fetch them if the server count is low (< 10).
                if (serversData.length <= 10) {
                    const promises = serversData.map(s => serverService.getPlugins(s.id).catch(() => []));
                    const allPlugins = await Promise.all(promises);

                    allPlugins.forEach(plugins => {
                        pluginCount += plugins.length;
                        updateCount += plugins.filter(p => p.latest_version && p.current_version !== p.latest_version).length;
                    });
                }

                setStats({
                    totalServers: serversData.length,
                    activeServers: activeCount,
                    totalPlugins: pluginCount,
                    updatesAvailable: updateCount
                });

            } catch (error) {
                console.error('Failed to load dashboard stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
                <p className="text-gray-400 mt-1">Overview of your Pterodactyl infrastructure.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ServerIcon className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl w-fit mb-4">
                            <ServerIcon className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-blue-200/60">Total Servers</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{stats.totalServers}</h3>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-2xl shadow-sm relative overflow-hidden group hover:border-green-500/40 transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity className="w-24 h-24 text-green-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="p-3 bg-green-500/20 text-green-400 rounded-xl w-fit mb-4">
                            <Activity className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-green-200/60">Active Servers</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{stats.activeServers}</h3>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-2xl shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Package className="w-24 h-24 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl w-fit mb-4">
                            <Package className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-purple-200/60">Total Plugins</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{loading ? '...' : stats.totalPlugins}</h3>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl shadow-sm relative overflow-hidden group hover:border-orange-500/40 transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="w-24 h-24 text-orange-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="p-3 bg-orange-500/20 text-orange-400 rounded-xl w-fit mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-orange-200/60">Available Updates</p>
                        <h3 className="text-3xl font-bold text-white mt-1">{loading ? '...' : stats.updatesAvailable}</h3>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Network Wide Actions */}
                    <div className="bg-[#0F1219] border border-gray-800 rounded-xl p-5 space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Network Operations</h4>
                        <div className="space-y-3">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                                onClick={() => {
                                    toast.promise(pluginService.scanNetwork(), {
                                        loading: 'Starting network-wide scan...',
                                        success: 'Network scan started in background',
                                        error: 'Failed to start network scan'
                                    });
                                }}
                            >
                                <Activity className="w-4 h-4" />
                                Scan All Plugins (Network)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/50 transition-all"
                                onClick={() => {
                                    // Confirmation dialog ideally, but for now direct action
                                    if (confirm('Are you sure you want to update ALL plugins across the ENTIRE network?')) {
                                        toast.promise(pluginService.updateNetwork(), {
                                            loading: 'Initiating network-wide update...',
                                            success: 'Network update started in background',
                                            error: 'Failed to start network update'
                                        });
                                    }
                                }}
                            >
                                <Package className="w-4 h-4" />
                                Update All Plugins (Network)
                            </Button>
                        </div>
                    </div>

                    {/* Single Server Actions */}
                    <div className="bg-[#0F1219] border border-gray-800 rounded-xl p-5 space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Single Server Operations</h4>
                        <div className="space-y-3">
                            <select
                                className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
                                onChange={(e) => {
                                    const server = servers.find(s => s.id === e.target.value);
                                    if (server) {
                                        if (confirm(`Update all plugins on ${server.name}?`)) {
                                            toast.promise(serverService.installAllUpdates(server.id), {
                                                loading: `Updating plugins on ${server.name}...`,
                                                success: 'Update job started',
                                                error: 'Failed to start update'
                                            });
                                        }
                                    }
                                    e.target.value = ""; // Reset selection
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Select Server to Update...</option>
                                {servers.map(server => (
                                    <option key={server.id} value={server.id}>{server.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500">
                                Select a server to immediately trigger an update for all its plugins.
                            </p>
                        </div>
                    </div>

                    {/* Global Configuration */}
                    <div className="bg-[#0F1219] border border-gray-800 rounded-xl p-5 space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Configuration</h4>
                        <Button
                            variant="outline"
                            className="w-full justify-start gap-2"
                            onClick={() => window.location.href = '/settings'}
                        >
                            <Settings className="w-4 h-4" />
                            Global Settings & Webhooks
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

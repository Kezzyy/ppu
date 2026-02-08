import { useEffect, useState } from 'react';
import { serverService } from '../services/api';
import type { Plugin, Server } from '../types/entities';
import { Button } from './ui/button';
import { Search, Loader2, RefreshCw, AlertTriangle, History, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSocket } from '../services/socket';

interface PluginListProps {
    server: Server;
}

import PluginLinkModal from './PluginLinkModal';
import VersionHistoryModal from './VersionHistoryModal';

export default function PluginList({ server }: PluginListProps) {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updatingPluginId, setUpdatingPluginId] = useState<string | null>(null);

    // Modal state
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

    // History Modal state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyPlugin, setHistoryPlugin] = useState<Plugin | null>(null);

    const openHistoryModal = (plugin: Plugin) => {
        setHistoryPlugin(plugin);
        setIsHistoryModalOpen(true);
    };

    const handleDelete = async (plugin: Plugin) => {
        if (!confirm(`Are you sure you want to delete ${plugin.name}? This will remove the file from the server.`)) {
            return;
        }

        try {
            const response = await serverService.deletePlugin(plugin.id);
            if (response.status === 'success') {
                setPlugins(prev => prev.filter(p => p.id !== plugin.id));
                toast.success('Plugin deleted');
            }
        } catch (error) {
            console.error('Failed to delete plugin', error);
            toast.error('Failed to delete plugin');
        }
    };

    const handleUpdate = async (plugin: Plugin) => {
        try {
            setUpdatingPluginId(plugin.id);
            await serverService.installUpdate(plugin.id);
            await fetchPlugins();
        } catch (error) {
            console.error('Failed to update plugin', error);
        } finally {
            setUpdatingPluginId(null);
        }
    };

    const fetchPlugins = async () => {
        try {
            setLoading(true);
            const response = await serverService.getPlugins(server.id);
            setPlugins(response);
        } catch (error) {
            console.error('Failed to fetch plugins', error);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async () => {
        try {
            setScanning(true);
            await serverService.scanPlugins(server.id);
            await fetchPlugins();
            toast.success('Quick scan completed');
        } catch (error) {
            console.error('Failed to scan plugins', error);
            toast.error('Quick scan failed');
        } finally {
            setScanning(false);
        }
    };


    const handleCheckUpdates = async () => {
        try {
            setCheckingUpdates(true);
            await serverService.checkUpdates(server.id);
            await fetchPlugins();
        } catch (error) {
            console.error('Failed to check updates', error);
        } finally {
            setCheckingUpdates(false);
        }
    };

    const openLinkModal = (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        setIsLinkModalOpen(true);
    };

    const handleLinkPlugin = async (sourceId: string, sourceType: 'spigot' | 'modrinth') => {
        if (!selectedPlugin) return;

        try {
            await serverService.updatePlugin(selectedPlugin.id, {
                source_id: sourceId,
                source_type: sourceType,
                is_managed: true // Mark as managed once linked
            });

            // Close modal and refresh list
            setIsLinkModalOpen(false);
            fetchPlugins();
        } catch (error) {
            console.error('Failed to link plugin', error);
            // Optionally show error toast here
        }
    };

    const [progress, setProgress] = useState<{ current: number; total: number; status: string; retryAfter?: number } | null>(null);

    useEffect(() => {
        fetchPlugins();

        // Check for existing progress on mount
        const checkExistingProgress = async () => {
            try {
                const response = await serverService.getBulkUpdateProgress(server.id);
                if (response.status === 'success' && response.data) {
                    const data = response.data;
                    // Only show if running or paused
                    if (data.status === 'running' || data.status === 'paused_rate_limit') {
                        console.log('Restored progress:', data);
                        setProgress({
                            current: data.completed + data.failed,
                            total: data.total,
                            status: data.status,
                            retryAfter: data.retryAfter // Optional in type, but good to have
                        });
                        setCheckingUpdates(true); // Lock buttons
                    }
                }
            } catch (e) {
                console.error('Failed to check existing progress', e);
            }
        };

        checkExistingProgress();

        const socket = getSocket();

        // Join server room
        socket.emit('join-server', server.id);

        const handleProgress = (data: any) => {
            if (data.serverId === server.id) {
                console.log('Progress:', data);
                setProgress(data);

                // Handle Rate Limit message
                if (data.retryAfter) {
                    toast.warning(`Rate limit hit. Resuming in ${data.retryAfter}s...`);
                }

                if (data.status === 'success' || data.status === 'failed') {
                    // Refresh list on individual completion to show new versions
                    fetchPlugins();
                }

                if (data.current === data.total && (data.status === 'success' || data.status === 'failed' || data.status === 'completed')) {
                    // Bulk update finished
                    setCheckingUpdates(false);
                    setTimeout(() => setProgress(null), 3000); // Clear progress after 3s
                }
            }
        };

        const handleRateLimit = (data: any) => {
            if (data.serverId === server.id) {
                console.log('Rate Limit WebSocket:', data);
                toast.warning(data.message);
                setProgress(prev => prev ? { ...prev, status: 'paused_rate_limit', retryAfter: data.retryAfter } : null);
            }
        };

        socket.on('plugin:update:progress', handleProgress);
        socket.on('plugin:update:ratelimit', handleRateLimit);
        socket.on('plugin:scan:progress', handleProgress);
        socket.on('plugin:scan:completed', (data) => {
            if (data.serverId === server.id) {
                toast.success(`Deep scan completed. Matched: ${data.matched}`);
                setScanning(false);
                setProgress(null);
                fetchPlugins();
            }
        });

        return () => {
            socket.emit('leave-server', server.id);
            socket.off('plugin:update:progress', handleProgress);
            socket.off('plugin:update:ratelimit', handleRateLimit);
            socket.off('plugin:scan:progress', handleProgress);
            socket.off('plugin:scan:completed');
        };
    }, [server.id]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Plugins</h2>
                    <p className="text-sm text-muted-foreground mr-2">
                        Managing {server.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    {progress && (
                        <div className="flex items-center gap-2 mr-4 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-md">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>
                                {progress.status === 'paused_rate_limit'
                                    ? `Rate Limited (Wait ${progress.retryAfter}s)`
                                    : progress.status === 'processing' && progress.total > 0
                                        ? `Processing: ${progress.current}/${progress.total}`
                                        : 'Processing...'}
                            </span>
                            {/* Simple progress bar */}
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden ml-2">
                                <div
                                    className={`h-full transition-all duration-500 ${progress.status === 'paused_rate_limit' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {plugins.some(p => p.latest_version && p.latest_version !== 'unknown' && p.latest_version !== p.current_version) && !progress && (
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                                try {
                                    setCheckingUpdates(true);
                                    await serverService.installAllUpdates(server.id);
                                    // Don't await fetchPlugins here, socket will handle it
                                } catch (err) {
                                    console.error('Bulk update failed', err);
                                    setCheckingUpdates(false);
                                }
                            }}
                            disabled={checkingUpdates || scanning || !!updatingPluginId}
                        >
                            {checkingUpdates ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Update All
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleCheckUpdates} disabled={checkingUpdates}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${checkingUpdates ? 'animate-spin' : ''}`} />
                        Check Updates
                    </Button>
                    <Button onClick={handleScan} disabled={scanning || checkingUpdates}>
                        {scanning ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4 mr-2" />
                        )}
                        Quick Scan
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg bg-card">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading plugins...</div>
                ) : plugins.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No plugins found. Run a scan to detect installed plugins.
                    </div>
                ) : (
                    <div className="divide-y">
                        {plugins.map((plugin) => {
                            const hasUpdate = plugin.latest_version && plugin.current_version !== 'unknown' && plugin.latest_version !== 'unknown' && plugin.current_version !== plugin.latest_version;
                            return (
                                <div key={plugin.id} className="p-4 flex items-center justify-between hover:bg-accent/20">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="font-medium truncate">{plugin.name}</div>
                                            {plugin.source_type !== 'manual' && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider border ${plugin.source_type === 'spigot'
                                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                    : 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    }`}>
                                                    {plugin.source_type}
                                                </span>
                                            )}
                                            {hasUpdate && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    UPDATE AVAILABLE
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate">{plugin.filename}</div>
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-right text-sm">
                                            <div className="text-muted-foreground">
                                                <span className={hasUpdate ? 'text-red-400 line-through mr-2' : ''}>{plugin.current_version}</span>
                                                {hasUpdate && (
                                                    <span className="text-green-400 font-medium">{plugin.latest_version}</span>
                                                )}
                                            </div>
                                            <div className={`text-xs ${plugin.is_managed ? 'text-green-500' : 'text-amber-500'}`}>
                                                {plugin.is_managed ? 'Managed' : 'Unmanaged'}
                                            </div>
                                        </div>
                                        {hasUpdate && (
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                disabled={!!updatingPluginId}
                                                onClick={() => handleUpdate(plugin)}
                                            >
                                                {updatingPluginId === plugin.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    'Update'
                                                )}
                                            </Button>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openLinkModal(plugin)}
                                            disabled={!!updatingPluginId}
                                        >
                                            {plugin.is_managed ? 'Manage' : 'Link'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openHistoryModal(plugin)}
                                            disabled={!!updatingPluginId || !plugin.is_managed}
                                            title="View Version History"
                                        >
                                            <History className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(plugin)}
                                            disabled={!!updatingPluginId}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                            title="Delete Plugin"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedPlugin && (
                <PluginLinkModal
                    isOpen={isLinkModalOpen}
                    onClose={() => setIsLinkModalOpen(false)}
                    pluginName={selectedPlugin.filename}
                    onLink={handleLinkPlugin}
                />
            )}

            {historyPlugin && (
                <VersionHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    pluginId={historyPlugin.id}
                    pluginName={historyPlugin.name}
                    currentVersion={historyPlugin.current_version}
                    onRollbackSuccess={() => {
                        fetchPlugins(); // Refresh to show new version
                    }}
                />
            )}
        </div>
    );
}

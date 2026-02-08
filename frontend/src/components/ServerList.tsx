import { useEffect, useState } from 'react';
import { serverService } from '../services/api';
import type { Server } from '../types/entities';
import { Button } from './ui/button';
import { RefreshCw, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface ServerListProps {
    onSelectServer: (server: Server) => void;
    selectedServerId?: string;
}

export default function ServerList({ onSelectServer, selectedServerId }: ServerListProps) {
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    const fetchServers = async () => {
        try {
            setLoading(true);
            const data = await serverService.getAll();
            // Sort by display_order
            const sortedData = data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            setServers(sortedData);
        } catch (error) {
            console.error('Failed to fetch servers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            await serverService.sync();
            await fetchServers();
        } catch (error) {
            console.error('Failed to sync servers', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedItem(index);
    };

    const handleDragEnter = (index: number) => {
        if (draggedItem === null) return;
        if (draggedItem !== index) {
            const newServers = [...servers];
            const draggedServer = newServers[draggedItem];
            newServers.splice(draggedItem, 1);
            newServers.splice(index, 0, draggedServer);
            setDraggedItem(index);
            setServers(newServers);
        }
    };

    const handleDragEnd = async () => {
        setDraggedItem(null);
        // Save new order
        const orders = servers.map((server, index) => ({
            id: server.id,
            order: index
        }));

        try {
            await serverService.updateOrder(orders);
            // Update local state display_order to match new indices so unexpected re-sorts don't happen
            setServers(prev => prev.map((s, i) => ({ ...s, display_order: i })));
        } catch (error) {
            console.error('Failed to save order', error);
            toast.error('Failed to save server order');
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Servers
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-white"
                    onClick={handleSync}
                    disabled={syncing}
                    title="Sync Servers"
                >
                    <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                </Button>
            </div>

            <div className="flex flex-col gap-1">
                {loading && <p className="text-xs text-muted-foreground px-2">Loading...</p>}

                {!loading && servers.length === 0 && (
                    <div className="text-center p-4 border border-dashed border-gray-800 rounded mx-2">
                        <p className="text-xs text-muted-foreground mb-2">No servers.</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSync}>Sync</Button>
                    </div>
                )}

                {servers.map((server, index) => (
                    <div
                        key={server.id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => onSelectServer(server)}
                        className={cn(
                            "group px-3 py-2 rounded-md cursor-pointer transition-all relative flex items-center gap-3",
                            selectedServerId === server.id
                                ? "bg-blue-600/10 text-blue-400"
                                : "text-gray-400 hover:text-gray-100 hover:bg-gray-800",
                            draggedItem === index && "opacity-50 border-dashed border border-gray-700"
                        )}
                    >
                        {/* Status Dot */}
                        <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            server.status === 'running' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-gray-600"
                        )} />

                        <div className="flex-1 truncate">
                            <div className="font-medium text-sm truncate">{server.name}</div>
                        </div>

                        {/* Drag Handle (Hidden until hover) */}
                        <div className="cursor-grab active:cursor-grabbing text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-3 h-3" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

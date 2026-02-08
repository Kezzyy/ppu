import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Webhook as WebhookIcon, Send, Server as ServerIcon, Globe } from 'lucide-react';
import { webhookService, serverService } from '../../services/api';
import type { Webhook, Server } from '../../types/entities';
import { toast } from 'sonner';

const WebhookSettings: React.FC = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [servers, setServers] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [events, setEvents] = useState<string[]>(['plugin:update:success', 'plugin:update:failed']);
    const [allServers, setAllServers] = useState(true);
    const [selectedServers, setSelectedServers] = useState<string[]>([]);

    const availableEvents = [
        { id: 'plugin:update:success', label: 'Plugin Update Success' },
        { id: 'plugin:update:failed', label: 'Plugin Update Failed' },
        { id: 'plugin:bulk:completed', label: 'Bulk Update Completed' },
        { id: 'server:restart', label: 'Server Restart (Future)' },
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const [webhooksData, serversData] = await Promise.all([
                webhookService.getAll(),
                serverService.getAll()
            ]);
            setWebhooks(webhooksData);
            setServers(serversData);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await webhookService.create({
                name,
                url,
                type: 'discord', // Default
                events,
                all_servers: allServers,
                server_ids: allServers ? [] : selectedServers
            });
            toast.success('Webhook created');
            setIsCreating(false);
            resetForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to create webhook');
            console.error(error);
        }
    };

    const resetForm = () => {
        setName('');
        setUrl('');
        setEvents(['plugin:update:success', 'plugin:update:failed']);
        setAllServers(true);
        setSelectedServers([]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this webhook?')) return;
        try {
            await webhookService.delete(id);
            toast.success('Webhook deleted');
            setWebhooks(webhooks.filter(w => w.id !== id));
        } catch (error) {
            toast.error('Failed to delete webhook');
        }
    };

    const handleTest = async (event: string) => {
        try {
            toast.promise(webhookService.test(event), {
                loading: 'Sending test webhook...',
                success: 'Test webhook sent!',
                error: 'Failed to send test webhook'
            });
        } catch (error) {
            // Toast handled by promise
        }
    };

    const toggleEvent = (eventId: string) => {
        setEvents(prev =>
            prev.includes(eventId)
                ? prev.filter(e => e !== eventId)
                : [...prev, eventId]
        );
    };

    const toggleServer = (serverId: string) => {
        setSelectedServers(prev =>
            prev.includes(serverId)
                ? prev.filter(s => s !== serverId)
                : [...prev, serverId]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <WebhookIcon className="w-5 h-5 text-purple-400" /> Global Webhooks
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Configure webhooks to receive notifications for events across all your servers.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isCreating
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                        }`}
                >
                    {isCreating ? 'Cancel' : <><Plus className="w-4 h-4" /> New Webhook</>}
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#0B0E14] border border-gray-700/50 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="e.g. Discord #updates"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Webhook URL</label>
                                <input
                                    type="url"
                                    required
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full bg-[#0B0E14] border border-gray-700/50 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-xs"
                                    placeholder="https://discord.com/api/webhooks/..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Scope</label>
                                <div className="space-y-3">
                                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${allServers ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0B0E14] border-gray-800 hover:border-gray-700'}`}>
                                        <input
                                            type="radio"
                                            checked={allServers}
                                            onChange={() => setAllServers(true)}
                                            className="text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                                        />
                                        <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
                                            <Globe className="w-4 h-4 text-blue-400" />
                                            All Servers
                                        </span>
                                    </label>
                                    <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${!allServers ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#0B0E14] border-gray-800 hover:border-gray-700'}`}>
                                        <input
                                            type="radio"
                                            checked={!allServers}
                                            onChange={() => setAllServers(false)}
                                            className="text-blue-500 focus:ring-blue-500 bg-gray-900 border-gray-700"
                                        />
                                        <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
                                            <ServerIcon className="w-4 h-4 text-purple-400" />
                                            Specific Servers
                                        </span>
                                    </label>
                                </div>

                                {!allServers && (
                                    <div className="mt-3 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto bg-[#0B0E14] p-3 rounded-lg border border-gray-800 custom-scrollbar">
                                        {servers.map(server => (
                                            <label key={server.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-800/50 p-1.5 rounded transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedServers.includes(server.id)}
                                                    onChange={() => toggleServer(server.id)}
                                                    className="rounded bg-gray-800 border-gray-700 text-blue-500"
                                                />
                                                <span className="text-xs font-medium text-gray-300 truncate" title={server.name}>{server.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Events to Notify</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            {availableEvents.map(event => (
                                <label
                                    key={event.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${events.includes(event.id)
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : 'bg-[#0B0E14] border-gray-800 hover:border-gray-700'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={events.includes(event.id)}
                                        onChange={() => toggleEvent(event.id)}
                                        className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                                    />
                                    <span className={`text-xs font-medium ${events.includes(event.id) ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {event.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg text-white font-medium shadow-lg shadow-blue-900/20 transition-all"
                        >
                            Create Webhook
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading webhooks...</p>
                </div>
            ) : webhooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-gray-900/20 rounded-2xl border border-dashed border-gray-800 text-center">
                    <div className="p-4 bg-gray-800/50 rounded-full mb-4">
                        <WebhookIcon className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No webhooks configured</h3>
                    <p className="text-sm text-gray-500 mt-2 max-w-sm">
                        Create a webhook to receive real-time notifications about your servers and plugins on Discord.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {webhooks.map(webhook => (
                        <div key={webhook.id} className="group bg-[#0B0E14] hover:bg-gray-900/40 p-5 rounded-xl border border-gray-800 hover:border-gray-700 transition-all shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-white text-lg">
                                            {webhook.name}
                                        </h3>
                                        <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                            {webhook.type}
                                        </span>
                                        {webhook.all_servers ? (
                                            <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
                                                <Globe className="w-3 h-3" /> All Servers
                                            </span>
                                        ) : (
                                            <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20 flex items-center gap-1" title={webhook.servers?.map(s => s.name).join(', ')}>
                                                <ServerIcon className="w-3 h-3" /> {webhook.servers?.length || 0} Servers
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono truncate max-w-lg bg-gray-900/50 px-2 py-1 rounded w-fit">
                                        {webhook.url}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleTest('plugin:update:success')}
                                        className="p-2 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 rounded-lg transition-colors"
                                        title="Send Test Notification"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
                                        title="Delete Webhook"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-800/50">
                                {webhook.events.map(event => (
                                    <span key={event} className="text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 px-2.5 py-1 rounded-md">
                                        {availableEvents.find(e => e.id === event)?.label || event}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WebhookSettings;

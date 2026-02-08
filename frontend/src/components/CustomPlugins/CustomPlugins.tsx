import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customPluginService, serverService } from '../../services/api';
import { toast } from 'sonner';
import { Plus, Upload, Trash2, Server as ServerIcon, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "../ui/dialog";
import { Input } from "../ui/input";

const CustomPlugins = () => {
    const queryClient = useQueryClient();
    const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
    const [deployVersion, setDeployVersion] = useState<{ pluginId: string, versionId: string, version: string } | null>(null);
    const [newPluginOpen, setNewPluginOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);

    // Queries
    const { data: plugins, isLoading } = useQuery({
        queryKey: ['custom-plugins'],
        queryFn: customPluginService.getAll
    });

    const { data: servers } = useQuery({
        queryKey: ['servers'],
        queryFn: serverService.getAll
    });

    // Mutations
    const createPluginMutation = useMutation({
        mutationFn: customPluginService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['custom-plugins'] });
            toast.success('Plugin created successfully');
            setNewPluginOpen(false);
            setNewPluginData({ name: '', description: '', author: '' });
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to create plugin')
    });

    const uploadVersionMutation = useMutation({
        mutationFn: ({ pluginId, version, file }: { pluginId: string, version: string, file: File }) =>
            customPluginService.uploadVersion(pluginId, version, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['custom-plugins'] });
            toast.success('Version uploaded successfully');
            setUploadOpen(false);
            setUploadData({ version: '', file: null });
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to upload version')
    });

    const deletePluginMutation = useMutation({
        mutationFn: customPluginService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['custom-plugins'] });
            toast.success('Plugin deleted');
        }
    });

    const deleteVersionMutation = useMutation({
        mutationFn: customPluginService.deleteVersion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['custom-plugins'] });
            toast.success('Version deleted');
        }
    });

    const deployMutation = useMutation({
        mutationFn: ({ versionId, serverIds }: { versionId: string, serverIds: string[] }) =>
            customPluginService.deploy(versionId, serverIds),
        onSuccess: (data: any) => {
            toast.success(`Deployment initiated for ${data.data.length} servers`);
            setDeployVersion(null);
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to deploy')
    });

    // Forms State
    const [newPluginData, setNewPluginData] = useState({ name: '', description: '', author: '' });
    const [uploadData, setUploadData] = useState<{ version: string, file: File | null }>({ version: '', file: null });
    const [selectedServers, setSelectedServers] = useState<string[]>([]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createPluginMutation.mutate(newPluginData);
    };

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlugin && uploadData.file) {
            uploadVersionMutation.mutate({
                pluginId: selectedPlugin,
                version: uploadData.version,
                file: uploadData.file
            });
        }
    };

    const handleDeploy = () => {
        if (deployVersion && selectedServers.length > 0) {
            deployMutation.mutate({
                versionId: deployVersion.versionId,
                serverIds: selectedServers
            });
        }
    };

    const toggleServer = (id: string) => {
        setSelectedServers(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (servers) {
            if (selectedServers.length === servers.length) {
                setSelectedServers([]);
            } else {
                setSelectedServers(servers.map(s => s.id));
            }
        }
    };

    if (isLoading) return <div className="p-8 text-center text-zinc-400">Loading custom plugins...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Custom Plugins
                    </h1>
                    <p className="text-zinc-400 mt-1">Manage and deploy your private plugins across the network.</p>
                </div>

                <Button
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                    onClick={() => setNewPluginOpen(true)}
                >
                    <Plus size={18} /> New Plugin
                </Button>

                <Dialog open={newPluginOpen} onOpenChange={setNewPluginOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Plugin</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Name</label>
                                <Input
                                    value={newPluginData.name}
                                    onChange={e => setNewPluginData({ ...newPluginData, name: e.target.value })}
                                    placeholder="MyCustomPlugin"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Description</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newPluginData.description}
                                    onChange={e => setNewPluginData({ ...newPluginData, description: e.target.value })}
                                    placeholder="What does this plugin do?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Author</label>
                                <Input
                                    value={newPluginData.author}
                                    onChange={e => setNewPluginData({ ...newPluginData, author: e.target.value })}
                                    placeholder="Your Name"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createPluginMutation.isPending}>
                                    {createPluginMutation.isPending ? 'Creating...' : 'Create Plugin'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4">
                {plugins?.length === 0 && (
                    <div className="text-center py-12 bg-zinc-900/50 rounded-lg border border-zinc-800">
                        <Package size={48} className="mx-auto text-zinc-600 mb-4" />
                        <h3 className="text-xl font-medium text-zinc-300">No Custom Plugins</h3>
                        <p className="text-zinc-500">Create your first custom plugin to get started.</p>
                    </div>
                )}

                {plugins?.map((plugin) => (
                    <div key={plugin.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                        <div className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}>
                                {selectedPlugin === plugin.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                <div>
                                    <h3 className="font-semibold text-lg">{plugin.name}</h3>
                                    <p className="text-sm text-zinc-400">{plugin.description || 'No description'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400">
                                    {plugin.versions.length} versions
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-zinc-700 hover:bg-zinc-800"
                                    onClick={() => {
                                        setSelectedPlugin(plugin.id);
                                        setUploadOpen(true);
                                    }}
                                >
                                    <Upload size={14} /> Upload Version
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    onClick={() => {
                                        if (confirm('Delete this plugin and all versions?')) deletePluginMutation.mutate(plugin.id);
                                    }}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>

                        {selectedPlugin === plugin.id && (
                            <div className="border-t border-zinc-800 bg-zinc-950/30 p-4 space-y-2">
                                {plugin.versions.length === 0 && <p className="text-sm text-zinc-500 italic">No versions uploaded yet.</p>}
                                {plugin.versions.map(version => (
                                    <div key={version.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded border border-zinc-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                            <span className="font-mono text-emerald-400">{version.version}</span>
                                            <span className="text-xs text-zinc-500">
                                                {(version.file_size / 1024 / 1024).toFixed(2)} MB
                                                • {new Date(version.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                                onClick={() => setDeployVersion({ pluginId: plugin.id, versionId: version.id, version: version.version })}
                                            >
                                                <ServerIcon size={14} /> Deploy
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-900/10"
                                                onClick={() => {
                                                    if (confirm('Delete this version?')) deleteVersionMutation.mutate(version.id);
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Upload Modal */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Version</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Version Number</label>
                            <Input
                                value={uploadData.version}
                                onChange={e => setUploadData({ ...uploadData, version: e.target.value })}
                                placeholder="1.0.0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">JAR File</label>
                            <Input
                                type="file"
                                accept=".jar"
                                onChange={e => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={uploadVersionMutation.isPending || !uploadData.file}>
                                {uploadVersionMutation.isPending ? 'Uploading...' : 'Upload'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Deploy Modal */}
            <Dialog open={!!deployVersion} onOpenChange={(open) => !open && setDeployVersion(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Deploy Plugin Version</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-zinc-400 mb-4">
                            Deploying <span className="text-white font-semibold">{deployVersion?.version}</span> to selected servers.
                        </p>

                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Select Servers</label>
                            <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="text-xs h-6">
                                {selectedServers.length === servers?.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                            {servers?.map(server => (
                                <div
                                    key={server.id}
                                    className={`
                                        flex items-center gap-3 p-3 rounded cursor-pointer border transition-all
                                        ${selectedServers.includes(server.id)
                                            ? 'bg-purple-900/30 border-purple-500/50'
                                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
                                    `}
                                    onClick={() => toggleServer(server.id)}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedServers.includes(server.id) ? 'bg-purple-600 border-purple-600' : 'border-zinc-600'}`}>
                                        {selectedServers.includes(server.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="truncate">
                                        <div className="font-medium text-sm truncate">{server.name}</div>
                                        <div className="text-xs text-zinc-500 truncate">{server.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <div className="flex items-center justify-between w-full">
                            <span className="text-sm text-zinc-400">
                                {selectedServers.length} servers selected
                            </span>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setDeployVersion(null)}>Cancel</Button>
                                <Button
                                    onClick={handleDeploy}
                                    disabled={deployMutation.isPending || selectedServers.length === 0}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {deployMutation.isPending ? 'Deploying...' : 'Deploy Now'}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CustomPlugins;

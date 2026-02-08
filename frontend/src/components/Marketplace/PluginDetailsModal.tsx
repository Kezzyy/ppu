import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Download, Calendar, User, ExternalLink, Box } from "lucide-react";

interface MarketplaceResult {
    id: string;
    name: string;
    tag_line: string;
    description: string;
    icon_url: string;
    source_type: 'spigot' | 'modrinth';
    source_url: string;
    download_count: number;
    author: string;
    last_updated: string;
    supported_versions?: string;
    loader?: string;
}

interface PluginDetailsModalProps {
    plugin: MarketplaceResult | null;
    isOpen: boolean;
    onClose: () => void;
    onInstall: (plugin: MarketplaceResult) => void;
}

export function PluginDetailsModal({ plugin, isOpen, onClose, onInstall }: PluginDetailsModalProps) {
    if (!plugin) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 text-white">
                <DialogHeader>
                    <div className="flex items-start gap-4">
                        <img
                            src={plugin.icon_url || `https://ui-avatars.com/api/?name=${plugin.name}&background=random`}
                            alt={plugin.name}
                            className="w-16 h-16 rounded-xl"
                        />
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {plugin.name}
                                <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                                    {plugin.source_type}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-gray-400 mt-1 text-base">
                                {plugin.tag_line}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                    <div className="space-y-4">
                        <div className="bg-gray-800/50 p-4 rounded-xl space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 flex items-center gap-2"><Download className="w-4 h-4" /> Downloads</span>
                                <span className="font-medium">{plugin.download_count?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 flex items-center gap-2"><User className="w-4 h-4" /> Author</span>
                                <span className="font-medium">{plugin.author}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Updated</span>
                                <span className="font-medium">{new Date(plugin.last_updated).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-4 rounded-xl space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400 flex items-center gap-2"><Box className="w-4 h-4" /> Loader</span>
                                <span className="font-medium text-white">{plugin.loader || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Supported Versions</span>
                                <span className="font-medium text-white max-w-[150px] truncate" title={plugin.supported_versions}>{plugin.supported_versions || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-300">Description</h3>
                        <div className="text-sm text-gray-400 leading-relaxed bg-gray-950/30 p-3 rounded-lg border border-gray-800 h-full max-h-[200px] overflow-y-auto">
                            {plugin.description || plugin.tag_line}
                            <div className="mt-4">
                                <a
                                    href={plugin.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs"
                                >
                                    View on {plugin.source_type === 'spigot' ? 'SpigotMC' : 'Modrinth'} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 justify-end pt-4 border-t border-gray-800">
                    <Button variant="ghost" onClick={onClose} className="hover:bg-gray-800 text-gray-300">Close</Button>
                    <Button
                        onClick={() => {
                            onInstall(plugin);
                            onClose();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
                    >
                        <Download className="w-4 h-4" /> Install Plugin
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

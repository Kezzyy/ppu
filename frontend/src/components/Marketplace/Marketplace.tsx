import React, { useState } from 'react';
import { marketplaceService, serverService } from '../../services/api';
import type { Server } from '../../types/entities'; // Ensure type-only import
import { Search, Download, Loader2, ExternalLink, Calendar, User, Box } from 'lucide-react';
import { toast } from 'sonner';
import { PluginDetailsModal } from './PluginDetailsModal';

interface MarketplaceProps {
    server: Server;
}

interface SearchResult {
    id: string;
    name: string;
    tag_line: string;
    description: string;
    icon_url: string;
    source_type: 'spigot' | 'modrinth';
    source_id: string;
    stats?: {
        downloads: number;
        rating: number;
    };
    link: string; // External link
    source_url?: string;
    premium: boolean;
    download_count?: number;
    author?: string;
    last_updated?: string;
    supported_versions?: string;
    loader?: string;
}

const Marketplace: React.FC<MarketplaceProps> = ({ server: _server }) => { // server is used in props but maybe not in function body yet?
    // It will be used for installation later
    const [query, setQuery] = useState('');
    const [platform, setPlatform] = useState<'all' | 'spigot' | 'modrinth'>('all');
    const [category, setCategory] = useState('all');
    const [loader, setLoader] = useState('all');
    const [sort, setSort] = useState('relevance');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [installing, setInstalling] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [selectedPlugin, setSelectedPlugin] = useState<SearchResult | null>(null);

    // Initial load: fetch most popular
    React.useEffect(() => {
        setSort('downloads'); // Default to popular
        handleSearch(undefined, 'downloads');
    }, []);

    const handleSearch = async (e?: React.FormEvent, overrideSort?: string) => {
        if (e) e.preventDefault();

        // If sorting by popular and query is empty, that's valid now
        const effectiveSort = overrideSort || sort;

        setLoading(true);
        setPage(1); // Reset page
        try {
            // New search, replace results
            const response = await marketplaceService.search(query, platform, 1, effectiveSort, category, loader);
            if (response.status === 'success') {
                const newResults = response.data as SearchResult[];
                setResults(newResults);
                setHasMore(newResults.length >= 9);
            }
        } catch (error) {
            toast.error('Failed to search plugins');
        } finally {
            setLoading(false);
        }
    };


    const handleInstall = async (plugin: SearchResult) => {
        if (plugin.premium) {
            toast.error('Cannot install premium plugins automatically.');
            return;
        }

        setInstalling(plugin.id);
        toast.info(`Installing ${plugin.name}...`);

        try {
            const response = await serverService.installPlugin(_server.id, {
                source_type: plugin.source_type,
                source_id: plugin.source_id || plugin.id, // Spigot/Modrinth IDs
                source_url: plugin.source_url // Optional, backend resolves it
            });

            if (response.status === 'success') {
                toast.success(`Successfully started installation for ${plugin.name}`);
            } else {
                toast.error(response.message || 'Installation failed');
            }

        } catch (error: any) {
            console.error('Install error:', error);
            toast.error(error.message || `Failed to install ${plugin.name}`);
        } finally {
            setInstalling(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-8">
            {/* Search Bar & Filters */}
            <div className="bg-gradient-to-r from-gray-900/80 to-gray-900/40 p-6 rounded-2xl border border-gray-800 space-y-4">
                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search plugins (e.g., EssentialsX, ViaVersion)... or leave empty for popular"
                            className="w-full bg-gray-950/50 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <select
                            value={platform}
                            onChange={(e) => setPlatform(e.target.value as any)}
                            className="bg-gray-950/50 border border-gray-700 text-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-[140px]"
                        >
                            <option value="all">All Platforms</option>
                            <option value="spigot">SpigotMC</option>
                            <option value="modrinth">Modrinth</option>
                        </select>

                        <select
                            value={loader}
                            onChange={(e) => setLoader(e.target.value)}
                            className="bg-gray-950/50 border border-gray-700 text-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-[140px]"
                        >
                            <option value="all">All Loaders</option>
                            <option value="paper">Paper / Spigot</option>
                            <option value="velocity">Velocity</option>
                            <option value="bungeecord">BungeeCord</option>
                            <option value="fabric">Fabric (Server)</option>
                            <option value="forge">Forge (Server)</option>
                        </select>

                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="bg-gray-950/50 border border-gray-700 text-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-[140px]"
                        >
                            <option value="all">All Categories</option>
                            <option value="admin">Admin Tools</option>
                            <option value="dev">Developer Tools</option>
                            <option value="chat">Chat</option>
                            <option value="economy">Economy</option>
                            <option value="mechanics">Mechanics</option>
                            <option value="world">World Management</option>
                        </select>

                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="bg-gray-950/50 border border-gray-700 text-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-[140px]"
                        >
                            <option value="relevance">Relevance</option>
                            <option value="downloads">Downloads (Popular)</option>
                            <option value="updated">Recently Updated</option>
                            <option value="newest">Newest</option>
                        </select>

                        <button
                            type="submit"
                            disabled={loading && page === 1}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 font-medium"
                        >
                            {loading && page === 1 ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((plugin) => (
                    <div
                        key={plugin.id}
                        className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 rounded-xl border border-gray-800 p-6 flex flex-col hover:border-blue-500/30 transition-all group relative overflow-hidden cursor-pointer"
                        onClick={() => setSelectedPlugin(plugin)}
                    >
                        {/* Card Content... */}
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <ExternalLink
                                className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(plugin.link || plugin.source_url, '_blank')
                                }}
                            />
                        </div>

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                {plugin.icon_url ? (
                                    <img src={plugin.icon_url} alt={plugin.name} className="w-14 h-14 rounded-xl shadow-lg" />
                                ) : (
                                    <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center text-xl font-bold text-gray-500 shadow-inner">
                                        {plugin.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1 max-w-[180px]" title={plugin.name}>{plugin.name}</h3>
                                    <div className="flex items-center gap-2 text-xs font-medium mt-1">
                                        <span className={`px-2 py-0.5 rounded-md ${plugin.source_type === 'spigot' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {plugin.source_type === 'modrinth' ? 'Modrinth' : 'SpigotMC'}
                                        </span>
                                        {plugin.premium && (
                                            <span className="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-md">Premium</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-400 text-sm mb-4 flex-1 line-clamp-2 leading-relaxed h-[40px]">
                            {plugin.tag_line || plugin.description}
                        </p>

                        {/* Extended Stats */}
                        <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1.5" title="Author">
                                <User className="w-3.5 h-3.5" />
                                <span className="truncate">{plugin.author || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Last Updated">
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="truncate">{plugin.last_updated ? new Date(plugin.last_updated).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Downloads">
                                <Download className="w-3.5 h-3.5" />
                                <span className="truncate">{plugin.download_count?.toLocaleString() || 'N/A'}</span>
                            </div>
                            {plugin.supported_versions && (
                                <div className="flex items-center gap-1.5" title="Supported Versions">
                                    <Box className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[80px]">{plugin.supported_versions}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-2 border-t border-gray-800/50">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleInstall(plugin);
                                }}
                                disabled={installing === plugin.id || plugin.premium || !!installing}
                                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-medium text-sm ${plugin.premium
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]'
                                    }`}
                            >
                                {installing === plugin.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        {plugin.premium ? 'Purchase' : 'Install'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-4 mt-8">
                <button
                    onClick={() => {
                        const prevPage = page - 1;
                        if (prevPage >= 1) {
                            setPage(prevPage);
                            setLoading(true);
                            marketplaceService.search(query, platform, prevPage, sort, category, loader)
                                .then(response => {
                                    if (response.status === 'success') {
                                        setResults(response.data as SearchResult[]);
                                        setHasMore(true);
                                    }
                                })
                                .catch(() => toast.error('Failed to load previous page'))
                                .finally(() => setLoading(false));
                        }
                    }}
                    disabled={page === 1 || loading}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    Previous
                </button>

                <span className="text-gray-400">Page {page}</span>

                <button
                    onClick={() => {
                        const nextPage = page + 1;
                        setPage(nextPage);
                        setLoading(true);
                        marketplaceService.search(query, platform, nextPage, sort, category, loader)
                            .then(response => {
                                if (response.status === 'success') {
                                    const newResults = response.data as SearchResult[];
                                    setResults(newResults);
                                    setHasMore(newResults.length >= 9);
                                }
                            })
                            .catch(() => toast.error('Failed to load next page'))
                            .finally(() => setLoading(false));
                    }}
                    disabled={!hasMore || loading}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    Next
                </button>
            </div>

            {results.length === 0 && !loading && (
                <div className="text-center text-gray-500 py-12">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Search for plugins to get started</p>
                </div>
            )}

            <PluginDetailsModal
                plugin={selectedPlugin as any}
                isOpen={!!selectedPlugin}
                onClose={() => setSelectedPlugin(null)}
                onInstall={(plugin) => handleInstall(plugin as SearchResult)}
            />
        </div>
    );
};

export default Marketplace;

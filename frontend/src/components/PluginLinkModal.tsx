import { useState, useEffect } from 'react';
import { marketplaceService } from '../services/api';
import { Button } from './ui/button';
import { Search, Loader2, Download, Box, ExternalLink } from 'lucide-react';

interface MarketplaceResult {
    id: string;
    name: string;
    tag_line: string;
    icon_url: string;
    source_type: 'spigot' | 'modrinth';
    source_url: string;
    download_count: number;
    author: string;
}

interface PluginLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    pluginName: string;
    onLink: (pluginId: string, source: 'spigot' | 'modrinth') => void;
}

const PluginLinkModal = ({ isOpen, onClose, pluginName, onLink }: PluginLinkModalProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MarketplaceResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [platformFilter, setPlatformFilter] = useState<string>('all');

    // Reset and auto-search when pluginName changes or modal opens
    useEffect(() => {
        if (isOpen && pluginName) {
            const cleanName = pluginName.replace('.jar', '').replace(/-[\d.]+/g, '');
            setQuery(cleanName);
            setResults([]);
            setSearched(false);

            // Auto-search
            const search = async () => {
                if (!cleanName.trim()) return;
                setLoading(true);
                setSearched(true);
                try {
                    const data = await marketplaceService.search(cleanName);
                    setResults(data.data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            };
            search();
        }
    }, [isOpen, pluginName]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const data = await marketplaceService.search(query);
            setResults(data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-[#1a1b1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#25262b]">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Box className="w-5 h-5 text-blue-400" />
                        Link Plugin: <span className="text-gray-400 font-mono text-sm">{pluginName}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/5 bg-[#1a1b1e]">
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                            placeholder="Search SpigotMC or Modrinth..."
                            autoFocus
                        />
                        <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            <span className="ml-2">Search</span>
                        </Button>
                    </div>
                    {/* Platform Filter */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Platform:</span>
                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        >
                            <option value="all">All Platforms</option>
                            <option value="paper">Paper</option>
                            <option value="spigot">Spigot</option>
                            <option value="bukkit">Bukkit</option>
                            <option value="velocity">Velocity</option>
                            <option value="purpur">Purpur</option>
                        </select>
                    </div>
                </div>

                {/* Results List */}
                <div className="overflow-y-auto p-2 space-y-2 bg-[#141517] flex-1 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 h-full">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-blue-500" />
                            <p>Searching marketplaces...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results
                            .filter(result => platformFilter === 'all' || result.name.toLowerCase().includes(platformFilter))
                            .sort((a, b) => b.download_count - a.download_count) // Sort by downloads descending
                            .map((result) => (
                                <div key={`${result.source_type}-${result.id}`} className="flex gap-3 p-4 rounded-lg hover:bg-white/5 transition-colors border border-white/5 group">
                                    {/* Icon */}
                                    <div className="shrink-0">
                                        <img
                                            src={result.icon_url && result.icon_url.trim() !== ''
                                                ? result.icon_url
                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name.charAt(0))}&size=128&background=2563eb&color=ffffff&bold=true&font-size=0.5`}
                                            alt={result.name}
                                            className="w-16 h-16 rounded-lg object-cover bg-gray-800 border border-white/5"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (!target.src.includes('ui-avatars.com')) {
                                                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(result.name.charAt(0))}&size=128&background=2563eb&color=ffffff&bold=true&font-size=0.5`;
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        {/* Title Row */}
                                        <div className="flex items-center gap-2">
                                            <h4
                                                className="font-semibold text-white hover:underline cursor-pointer truncate max-w-[300px]"
                                                onClick={() => window.open(result.source_url, '_blank')}
                                                title={result.name}
                                            >
                                                {result.name}
                                            </h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${result.source_type === 'spigot'
                                                ? 'bg-orange-500/20 text-orange-400'
                                                : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                {result.source_type}
                                            </span>
                                            <a
                                                href={result.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-gray-500 hover:text-white shrink-0"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                                            {result.tag_line}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <Download className="h-3.5 w-3.5" />
                                                {result.download_count.toLocaleString()}
                                            </span>
                                            <span className="truncate">by {result.author}</span>
                                        </div>
                                    </div>

                                    {/* Select Button */}
                                    <div className="shrink-0 self-center">
                                        <Button
                                            size="sm"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-500 text-white border-0"
                                            onClick={() => onLink(result.id, result.source_type)}
                                        >
                                            Select
                                        </Button>
                                    </div>
                                </div>
                            ))
                    ) : searched ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 h-full">
                            <Box className="h-12 w-12 text-gray-600 mb-2 opacity-50" />
                            <p>No results found.</p>
                            <p className="text-sm text-gray-600 mt-1">Try refining your search term.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 h-full">
                            <Search className="h-12 w-12 text-gray-600 mb-2 opacity-50" />
                            <p>Search for a plugin to link it.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PluginLinkModal;

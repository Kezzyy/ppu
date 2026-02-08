import axios from 'axios';
import redis from '../config/redis';

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
    last_updated: Date;
    supported_versions?: string;
    loader?: string;
}

class MarketplaceService {
    private spigetParams = {
        size: 9, // Limit results
        fields: 'id,name,tag,icon,author,likes,downloads,updateDate' // Select specific fields
    };

    private axiosClient = axios.create({
        headers: {
            'User-Agent': 'ShimatsuPluginUpdater/1.0.0 (kezzy@shimatsu.gg)' // Replace with real info
        }
    });

    /**
     * Search both Spigot and Modrinth
     */
    async search(query: string, platform: 'all' | 'spigot' | 'modrinth' = 'all', page: number = 1, sort: string = 'relevance', category: string = 'all', loader: string = 'all'): Promise<MarketplaceResult[]> {
        const cacheKey = `marketplace:v4:search:${platform}:${query.toLowerCase().trim()}:${page}:${sort}:${category}:${loader}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log(`[Marketplace] Returning cached results for "${query}" (Page ${page}, Sort ${sort}, Cat ${category}, Loader ${loader})`);
                return JSON.parse(cached);
            }
        } catch (error) {
            console.error('[Marketplace] Redis error:', error);
        }

        const promises: Promise<MarketplaceResult[]>[] = [];

        if (platform === 'all' || platform === 'spigot') {
            promises.push(this.searchSpigot(query, page, sort, category, loader));
        }

        if (platform === 'all' || platform === 'modrinth') {
            promises.push(this.searchModrinth(query, page, sort, category, loader));
        }

        const results = await Promise.all(promises);

        // Custom sort if not handled by APIs perfectly (though we try to use API sorting)
        // If sort is 'downloads', we can re-sort the combined result
        let flatResults = results.flat();

        if (sort === 'downloads') {
            flatResults = flatResults.sort((a, b) => b.download_count - a.download_count);
        } else if (sort === 'updated') {
            flatResults = flatResults.sort((a, b) => b.last_updated.getTime() - a.last_updated.getTime());
        }

        try {
            // Cache for 1 hour
            await redis.set(cacheKey, JSON.stringify(flatResults), 'EX', 3600);
        } catch (error) {
            console.error('[Marketplace] Failed to cache results:', error);
        }

        return flatResults;
    }

    /**
     * Search SpigotMC via Spiget API
     */
    private async searchSpigot(query: string, page: number, sort: string, category: string, loader: string): Promise<MarketplaceResult[]> {
        try {
            // Spiget doesn't support 'loader' filtering easily (Spigot resources are mostly Spigot/Paper).
            // If user asks for Velocity/Bungee, we might need to filter by category if we knew the IDs.
            // For now, if loader is NOT 'all' or 'spigot'/'paper', we might return empty for Spigot to avoid clutter?
            // Actually, Spigot resources work on Paper. 
            // If loader is 'velocity' or 'bungee', Spiget has categories for them.
            // Bungee = 2, Spigot = ? 
            // Since we can't reliably map names to IDs without a lookup, we'll skip strict loader filtering for Spiget 
            // UNLESS it's explicitly 'bungee' or 'velocity' where we might try to guess (but let's keep it simple for now).
            // We will just return results and let the user decide, or implementing strict filtering later.

            if (loader === 'velocity' || loader === 'fabric' || loader === 'forge') {
                // Spiget is mostly Bukkit/Spigot/Bungee. Fabric/Forge/Velocity are rare or specific categories.
                // We'll skip Spiget for Fabric/Forge to avoid irrelevance?
                // Velocity resources exist on SpigotMC but mixed.
                // Let's return empty for strictly non-Bukkit loaders to improve relevance.
                if (loader === 'fabric' || loader === 'forge') return [];
            }

            // Spiget Search endpoint doesn't support complex filtering well. Ref: https://spiget.org/documentation
            // However, /resources/ supports sorting. 
            // Strategy: 
            // If QUERY is present -> use /search/resources/{query} (limited sorting)
            // If QUERY is empty -> use /resources (supports sorting & paging)

            const params: any = { ...this.spigetParams, page: page };

            // Map Sort
            if (sort === 'downloads') params.sort = '-downloads';
            else if (sort === 'updated') params.sort = '-updateDate';
            else if (sort === 'newest') params.sort = '-submissionDate';

            let endpoint = '';

            if (query && query.trim().length > 0) {
                endpoint = `https://api.spiget.org/v2/search/resources/${encodeURIComponent(query)}`;
                // Search endpoint ignores 'sort' param in Spiget usually, but we pass it anyway just in case v2 supports it now or we sort locally.
            } else {
                endpoint = `https://api.spiget.org/v2/resources`;
                if (category !== 'all') {
                    // Spiget categories: 1=Bungee, 2=Spigot, etc. This mapping is hard.
                    // For now, if category is specific, we might skip Spigot or try to find list.
                    // Simplified: Ignore category for Spigot or default to searching known keywords if category is passed.
                }
            }

            const response = await this.axiosClient.get(endpoint, { params });

            return response.data.map((item: any) => ({
                id: item.id.toString(),
                name: item.name,
                tag_line: item.tag,
                description: item.tag,
                icon_url: item.icon?.url ? `https://www.spigotmc.org/${item.icon.url}` : '',
                source_type: 'spigot',
                source_url: `https://www.spigotmc.org/resources/${item.id}`,
                download_count: item.downloads,
                author: item.author?.id ? String(item.author.id) : 'Unknown',
                last_updated: new Date(item.updateDate * 1000),
                supported_versions: item.testedVersions ? item.testedVersions.join(', ') : 'Unknown', // Spiget Provides this
                loader: 'Spigot/Paper' // Hardcoded for SpigotMC usually
            }));
        } catch (error: any) {
            // Silently ignore 404 errors (plugin not found on Spigot)
            if (error.response?.status === 404) {
                return [];
            }
            console.error('Spiget Search Error:', error.message || error);
            return [];
        }
    }

    /**
     * Search Modrinth via Modrinth API
     */
    private async searchModrinth(query: string, page: number, sort: string, category: string, loader: string): Promise<MarketplaceResult[]> {
        try {
            // Modrinth uses offset and limit
            const limit = 9;
            const offset = (page - 1) * limit;

            // Build Facets
            const facets: string[][] = [['project_type:plugin']];
            if (category !== 'all') {
                // Map generic categories to Modrinth categories
                // e.g. 'admin' -> 'categories:admin_tools'
                const catMap: { [key: string]: string } = {
                    'admin': 'categories:admin_tools',
                    'dev': 'categories:developer_tools',
                    'chat': 'categories:chat',
                    'economy': 'categories:economy',
                    'mechanics': 'categories:game_mechanics',
                    'world': 'categories:world_management'
                };
                if (catMap[category]) {
                    facets.push([catMap[category]]);
                }
            }

            if (loader !== 'all') {
                // Map loader to Modrinth categories (loaders)
                // Modrinth uses 'categories:paper', 'categories:velocity', etc.
                const loaderMap: { [key: string]: string } = {
                    'paper': 'categories:paper',
                    'velocity': 'categories:velocity',
                    'waterfall': 'categories:waterfall', // Bungee fork
                    'bungeecord': 'categories:bungeecord',
                    'fabric': 'categories:fabric', // Some server-side fabric mods act as plugins
                    'forge': 'categories:forge'
                };
                if (loaderMap[loader]) {
                    facets.push([loaderMap[loader]]);
                } else if (loader === 'spigot') {
                    facets.push(['categories:spigot']);
                }
            }

            // Map Sort (index)
            let index = 'relevance';
            if (sort === 'downloads') index = 'downloads';
            else if (sort === 'updated') index = 'updated';
            else if (sort === 'newest') index = 'newest';

            const response = await this.axiosClient.get(`https://api.modrinth.com/v2/search`, {
                params: {
                    query: query,
                    facets: JSON.stringify(facets),
                    index: index,
                    limit: limit,
                    offset: offset
                }
            });

            return response.data.hits.map((item: any) => ({
                id: item.project_id,
                name: item.title,
                tag_line: item.description,
                description: item.description,
                icon_url: item.icon_url,
                source_type: 'modrinth',
                source_url: `https://modrinth.com/plugin/${item.slug}`,
                download_count: item.downloads,
                author: item.author,
                last_updated: new Date(item.date_modified),
                supported_versions: item.versions ? item.versions[item.versions.length - 1] : 'Unknown', // Modrinth search result doesn't give precise version list easily without extra call, but sometimes has generic version info. Actually hits don't have 'versions' array usually unless we fetch project. We'll leave as Unknown or fetch later if needed.
                loader: item.categories ? item.categories.filter((c: string) => ['paper', 'velocity', 'bungeecord', 'spigot'].includes(c)).join(', ') : 'Unknown'
            }));
        } catch (error: any) {
            console.error('Modrinth Search Error:', error.message || error);
            return [];
        }
    }

    /**
     * Get latest version from SpigotMC
     */
    async getLatestVersionSpigot(resourceId: string): Promise<string | null> {
        try {
            const response = await this.axiosClient.get(`https://api.spiget.org/v2/resources/${resourceId}/versions/latest`);
            return response.data.name;
        } catch (error) {
            console.error(`Error fetching Spigot version for ${resourceId}:`, error);
            return null;
        }
    }

    /**
     * Get latest version from Modrinth
     */
    async getLatestVersionModrinth(projectId: string): Promise<string | null> {
        try {
            const loaders = JSON.stringify(["spigot", "paper", "purpur"]);
            const response = await this.axiosClient.get(`https://api.modrinth.com/v2/project/${projectId}/version`, {
                params: {
                    loaders: loaders
                }
            });

            if (response.data && response.data.length > 0) {
                return response.data[0].version_number;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching Modrinth version for ${projectId}:`, error);
            return null;
        }
    }

    /**
     * Get download URL for latest version from SpigotMC
     */
    async getDownloadUrlSpigot(resourceId: string): Promise<string | null> {
        // https://api.spiget.org/v2/resources/12345/download
        return `https://api.spiget.org/v2/resources/${resourceId}/download`;
    }

    /**
     * Get download URL for latest version from Modrinth
     */
    async getDownloadUrlModrinth(projectId: string): Promise<string | null> {
        try {
            const loaders = JSON.stringify(["spigot", "paper", "purpur"]);
            const response = await this.axiosClient.get(`https://api.modrinth.com/v2/project/${projectId}/version`, {
                params: { loaders }
            });

            if (response.data && response.data.length > 0) {
                const latest = response.data[0];
                // Find primary file or first .jar
                const file = latest.files.find((f: any) => f.primary) || latest.files[0];
                if (file) {
                    return file.url;
                }
            }
            return null;
        } catch (error) {
            console.error(`Error fetching Modrinth download URL for ${projectId}:`, error);
            return null;
        }
    }

    async findByHash(sha1: string, sha512: string): Promise<MarketplaceResult | null> {
        // Check local cache first
        const cacheKey = `marketplace:hash:${sha1}`;
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            // Modrinth Version from Hash
            // POST https://api.modrinth.com/v2/version_file/{hash}?algorithm=sha1
            // or sha512
            // We'll use SHA-1 for broader compatibility, but SHA-512 is preferred by Modrinth

            // Try Modrinth
            try {
                const response = await this.axiosClient.post(`https://api.modrinth.com/v2/version_file/${sha1}?algorithm=sha1`);
                const versionData = response.data; // This returns the VERSION object

                if (versionData && versionData.project_id) {
                    // Fetch Project Details
                    const projectResponse = await this.axiosClient.get(`https://api.modrinth.com/v2/project/${versionData.project_id}`);
                    const project = projectResponse.data;

                    const result: MarketplaceResult = {
                        id: project.id,
                        name: project.title,
                        tag_line: project.description,
                        description: project.body,
                        icon_url: project.icon_url,
                        source_type: 'modrinth',
                        source_url: `https://modrinth.com/plugin/${project.slug}`,
                        download_count: project.downloads,
                        author: 'Unknown', // Need another call or use id
                        last_updated: new Date(project.updated),
                        supported_versions: versionData.game_versions.join(', '),
                        loader: versionData.loaders.join(', ')
                    };

                    // Cache
                    await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400 * 7); // Cache for 7 days
                    return result;
                }
            } catch (error: any) {
                if (error.response?.status === 404) {
                    // Not found on Modrinth - This is expected for non-Modrinth plugins
                    // console.log(`[Marketplace] Hash not found on Modrinth: ${sha1}`);
                } else {
                    console.error(`[Marketplace] Modrinth Hash Lookup Error: ${error.message} (Status: ${error.response?.status})`);
                }
            }

            // Spigot doesn't really have a public hash lookup API that is reliable without downloading everything.
            // We could try to match by filename if we had a massive DB, but for now we skip.

            return null;
        } catch (error) {
            console.error('Hash Lookup Error:', error);
            return null;
        }
    }
}

export default new MarketplaceService();

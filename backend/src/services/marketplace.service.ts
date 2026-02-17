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
            'User-Agent': 'ShimatsuPluginUpdater/1.0.0 (kezzy@shimatsu.gg)' // TODO
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
            if (loader === 'fabric' || loader === 'forge') return [];


            const params: any = { ...this.spigetParams, page: page };

            // Map sort params
            if (sort === 'downloads') params.sort = '-downloads';
            else if (sort === 'updated') params.sort = '-updateDate';
            else if (sort === 'newest') params.sort = '-submissionDate';

            let endpoint = '';

            if (query && query.trim().length > 0) {
                endpoint = `https://api.spiget.org/v2/search/resources/${encodeURIComponent(query)}`;
            } else {
                endpoint = `https://api.spiget.org/v2/resources`;
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
                supported_versions: item.testedVersions ? item.testedVersions.join(', ') : 'Unknown',
                loader: 'Spigot/Paper'
            }));
        } catch (error: any) {
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
            const limit = 9;
            const offset = (page - 1) * limit;

            const facets: string[][] = [['project_type:plugin']];
            if (category !== 'all') {
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
                const loaderMap: { [key: string]: string } = {
                    'paper': 'categories:paper',
                    'velocity': 'categories:velocity',
                    'waterfall': 'categories:waterfall',
                    'bungeecord': 'categories:bungeecord',
                    'fabric': 'categories:fabric',
                    'forge': 'categories:forge'
                };
                if (loaderMap[loader]) {
                    facets.push([loaderMap[loader]]);
                } else if (loader === 'spigot') {
                    facets.push(['categories:spigot']);
                }
            }

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
                supported_versions: item.versions ? item.versions[item.versions.length - 1] : 'Unknown',
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

    async getDownloadUrlSpigot(resourceId: string): Promise<string | null> {
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
        const cacheKey = `marketplace:hash:${sha1}`;
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        try {
            try {
                const response = await this.axiosClient.post(`https://api.modrinth.com/v2/version_file/${sha1}?algorithm=sha1`);
                const versionData = response.data;

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
                        author: 'Unknown',
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
                } else {
                    console.error(`[Marketplace] Modrinth Hash Lookup Error: ${error.message} (Status: ${error.response?.status})`);
                }
            }

            return null;
        } catch (error) {
            console.error('Hash Lookup Error:', error);
            return null;
        }
    }

    parsePluginUrl(url: string): { source_type: 'spigot' | 'modrinth'; source_id: string } | null {
        try {
            const parsed = new URL(url);

            // Modrinth: https://modrinth.com/plugin/{slug} or /mod/{slug}
            if (parsed.hostname === 'modrinth.com') {
                const parts = parsed.pathname.split('/').filter(Boolean);
                // e.g. ['plugin', 'viaversion'] or ['plugin', 'viaversion', 'version', 'xxx']
                if (parts.length >= 2 && (parts[0] === 'plugin' || parts[0] === 'mod')) {
                    return { source_type: 'modrinth', source_id: parts[1] };
                }
            }

            // Spigot: https://www.spigotmc.org/resources/{name}.{id}/ or /resources/{id}/
            if (parsed.hostname === 'www.spigotmc.org' || parsed.hostname === 'spigotmc.org') {
                const parts = parsed.pathname.split('/').filter(Boolean);
                if (parts.length >= 2 && parts[0] === 'resources') {
                    const resourcePart = parts[1].replace(/\/$/, '');
                    // Could be "essentialsx.9089" or just "9089"
                    const dotMatch = resourcePart.match(/\.(\d+)$/);
                    if (dotMatch) {
                        return { source_type: 'spigot', source_id: dotMatch[1] };
                    }
                    // Plain numeric ID
                    if (/^\d+$/.test(resourcePart)) {
                        return { source_type: 'spigot', source_id: resourcePart };
                    }
                }
            }
        } catch (e) {
            // Invalid URL
        }
        return null;
    }

    async resolveFromUrl(url: string): Promise<{ source_type: 'spigot' | 'modrinth'; source_id: string; name: string } | null> {
        const parsed = this.parsePluginUrl(url);
        if (!parsed) return null;

        try {
            if (parsed.source_type === 'modrinth') {
                // Slug lookup via Modrinth API
                const response = await this.axiosClient.get(`https://api.modrinth.com/v2/project/${parsed.source_id}`);
                if (response.data) {
                    return {
                        source_type: 'modrinth',
                        source_id: response.data.id, // Use actual project ID, not slug
                        name: response.data.title
                    };
                }
            } else if (parsed.source_type === 'spigot') {
                const response = await this.axiosClient.get(`https://api.spiget.org/v2/resources/${parsed.source_id}`, {
                    params: { fields: 'id,name' }
                });
                if (response.data) {
                    return {
                        source_type: 'spigot',
                        source_id: String(response.data.id),
                        name: response.data.name
                    };
                }
            }
        } catch (error: any) {
            console.error(`[Marketplace] Failed to resolve URL: ${url}`, error.message);
        }

        return null;
    }
}

export default new MarketplaceService();

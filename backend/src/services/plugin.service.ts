import prisma from '../prisma/client';
import fileService from './file.service';
import versionService from './version.service';
import webhookService from './webhook.service';
import fs from 'fs';
import { RateLimitError } from '../errors/RateLimitError';

class PluginService {
    /**
     * Scan a server's plugins directory and update the database
     */
    async scanPlugins(serverId: string) {
        // Get server to retrieve Pterodactyl internal ID
        const server = await prisma.server.findUnique({
            where: { id: serverId },
        });

        if (!server) {
            throw new Error('Server not found');
        }

        // List files in the standard plugins directory
        // Use 'identifier' (short UUID) for Client API calls
        const files = await fileService.listFiles(server.identifier, 'plugins', server.path);

        const jarFiles = files.data.filter(f => f.attributes.name.endsWith('.jar'));

        // Update database with found plugins
        const results = [];

        for (const file of jarFiles) {
            const filename = file.attributes.name;

            // Naive name extraction (e.g., "PluginName-1.0.jar" -> "PluginName-1.0")
            // TODO: Improve with actual JAR metadata reading
            const name = filename.replace('.jar', '');

            const plugin = await prisma.plugin.upsert({
                where: {
                    server_id_filename: {
                        server_id: server.id,
                        filename: filename,
                    }
                },
                update: {
                    // Only update mutable properties
                },
                create: {
                    server_id: server.id,
                    name: name,
                    filename: filename,
                    current_version: 'unknown',
                    is_managed: false,
                    source_type: 'manual',
                }
            });
            results.push(plugin);
        }

        return results;
    }

    /**
     * Get plugins for a server
     */
    async getPlugins(serverId: string) {
        return await prisma.plugin.findMany({
            where: { server_id: serverId },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Update a plugin
     */
    async updatePlugin(pluginId: string, data: any) {
        console.log(`Updating plugin ${pluginId} with data:`, data);
        return await prisma.plugin.update({
            where: { id: pluginId },
            data: data,
        });
    }

    /**
     * Check for updates for all managed plugins on a server
     */
    async checkUpdates(serverId: string) {
        console.log(`Checking updates for server: ${serverId}`);
        const plugins = await prisma.plugin.findMany({
            where: {
                server_id: serverId,
                is_managed: true,
                source_id: { not: null }
            }
        });

        console.log(`Found ${plugins.length} managed plugins to check.`);

        const updates = [];

        for (const plugin of plugins) {
            let latestVersion: string | null = null;

            console.log(`Checking plugin: ${plugin.name} (${plugin.source_type} ID: ${plugin.source_id})`);

            // Fetch latest version based on source
            if (plugin.source_type === 'spigot' && plugin.source_id) {
                const marketplaceService = require('./marketplace.service').default;
                latestVersion = await marketplaceService.getLatestVersionSpigot(plugin.source_id);
            } else if (plugin.source_type === 'modrinth' && plugin.source_id) {
                const marketplaceService = require('./marketplace.service').default;
                latestVersion = await marketplaceService.getLatestVersionModrinth(plugin.source_id);
            }

            console.log(`Plugin ${plugin.name}: Current=${plugin.current_version}, Latest=${latestVersion}`);

            // Update DB if version found
            if (latestVersion) {
                await prisma.plugin.update({
                    where: { id: plugin.id },
                    data: {
                        latest_version: latestVersion,
                        last_checked: new Date()
                    }
                });
                updates.push({
                    name: plugin.name,
                    current: plugin.current_version,
                    latest: latestVersion
                });
            }
        }

        return updates;
    }

    /**
     * Install an update for a plugin
     */
    async installUpdate(pluginId: string) {
        const plugin = await prisma.plugin.findUnique({
            where: { id: pluginId },
            include: { server: true }
        });

        if (!plugin) throw new Error('Plugin not found');
        if (!plugin.source_id) throw new Error('Plugin has no source linked');
        if (!plugin.latest_version) throw new Error('No update available');

        // Backup before updating
        try {
            console.log(`[PluginService] Backing up ${plugin.name} before update...`);
            await versionService.backupPlugin(plugin.id);
        } catch (error) {
            console.error(`[PluginService] Warning: Backup failed for ${plugin.name}`, error);
        }

        // Get download URL
        let downloadUrl: string | null = null;
        const marketplaceService = require('./marketplace.service').default;

        if (plugin.source_type === 'spigot') {
            downloadUrl = await marketplaceService.getDownloadUrlSpigot(plugin.source_id);
        } else if (plugin.source_type === 'modrinth') {
            downloadUrl = await marketplaceService.getDownloadUrlModrinth(plugin.source_id);
        }

        if (!downloadUrl) {
            throw new Error('Could not get download URL from marketplace');
        }

        console.log(`Installing update for ${plugin.name}: Downloading from ${downloadUrl}`);

        await fileService.pullFile(
            plugin.server.identifier,
            downloadUrl,
            '/plugins',
            plugin.filename,
            plugin.server.path
        );

        // Update DB
        const updatedPlugin = await prisma.plugin.update({
            where: { id: plugin.id },
            data: {
                current_version: plugin.latest_version,
                last_checked: new Date()
            }
        });

        // Dispatch Success Webhook
        webhookService.dispatch(plugin.server_id, 'plugin:update:success', {
            serverName: plugin.server.name,
            pluginName: plugin.name,
            oldVersion: plugin.current_version,
            newVersion: plugin.latest_version
        });

        return updatedPlugin;
    }

    /**
     * Install all available updates for a server
     */

    async installAllUpdates(serverId: string) {
        console.log(`Starting bulk update for server: ${serverId}`);

        // Find all plugins with updates
        const plugins = await prisma.plugin.findMany({
            where: {
                server_id: serverId,
                is_managed: true,
                source_id: { not: null },
                latest_version: { not: null }
            }
        });

        // Filter in JS to strictly check versions
        const toUpdate = plugins.filter(p =>
            p.latest_version &&
            p.latest_version !== 'unknown' &&
            p.latest_version !== p.current_version
        );

        console.log(`Found ${toUpdate.length} plugins to update.`);

        // Create or update progress record
        // We delete any existing "running" progress for this server first to avoid conflicts
        await prisma.bulkUpdateProgress.deleteMany({
            where: { server_id: serverId, status: 'running' }
        });

        const progress = await prisma.bulkUpdateProgress.create({
            data: {
                server_id: serverId,
                total: toUpdate.length,
                completed: 0,
                failed: 0,
                status: 'running',
                current_plugin: 'Starting...'
            }
        });

        const results = {
            total: toUpdate.length,
            success: 0,
            failed: 0,
            details: [] as any[]
        };

        // Initialize socket for progress updates
        let io;
        try {
            io = require('./socket.service').getIO();
        } catch (e) {
            console.warn('[PluginService] Socket.io not initialized, skipping progress updates');
        }

        // Default delay as fallback
        const defaultDelayMs = parseInt(process.env.BULK_UPDATE_DELAY_MS || '10000');
        console.log(`[PluginService] Default bulk update delay set to ${defaultDelayMs}ms`);

        for (let i = 0; i < toUpdate.length; i++) {
            const plugin = toUpdate[i];
            let retries = 3;
            let success = false;

            // Update DB progress
            await prisma.bulkUpdateProgress.update({
                where: { id: progress.id },
                data: { current_plugin: plugin.name }
            });

            while (retries > 0 && !success) {
                try {
                    // Update UI: Processing
                    if (io) {
                        io.to(`server:${serverId}`).emit('plugin:update:progress', {
                            serverId,
                            pluginName: plugin.name,
                            current: results.success + results.failed + 1,
                            total: results.total,
                            status: 'processing'
                        });
                    }

                    console.log(`Bulk updating: ${plugin.name} (Attempts left: ${retries})`);
                    await this.installUpdate(plugin.id);

                    results.success++;
                    results.details.push({ plugin: plugin.name, status: 'success' });
                    success = true;

                    if (io) {
                        io.to(`server:${serverId}`).emit('plugin:update:progress', {
                            serverId,
                            pluginName: plugin.name,
                            current: results.success + results.failed,
                            total: results.total,
                            status: 'success'
                        });
                    }

                    // Update DB Progress - Success
                    await prisma.bulkUpdateProgress.update({
                        where: { id: progress.id },
                        data: { completed: { increment: 1 } }
                    });

                    // Rate limiting mitigation - delay AFTER update, but not after the last one
                    if (i < toUpdate.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, defaultDelayMs));
                    }

                } catch (error: any) {
                    console.error(`Failed to update ${plugin.name}:`, error);

                    // Handle Rate Limit Error specially
                    if (error.name === 'RateLimitError' || error.response?.status === 429) {
                        // Extract retry delay from error or header
                        const retryAfter = error.retryAfter ||
                            (error.response?.headers['retry-after'] ? parseInt(error.response.headers['retry-after']) : 60);

                        console.log(`[PluginService] HIT RATE LIMIT for ${plugin.name}. Waiting ${retryAfter}s per Pterodactyl...`);

                        // Update DB Status - Paused
                        await prisma.bulkUpdateProgress.update({
                            where: { id: progress.id },
                            data: {
                                status: 'paused_rate_limit',
                                retry_after: retryAfter
                            }
                        });

                        // Notify UI about rate limit
                        if (io) {
                            io.to(`server:${serverId}`).emit('plugin:update:ratelimit', {
                                serverId,
                                retryAfter,
                                message: `Rate limit hit. Resuming in ${retryAfter} seconds...`
                            });
                        }

                        // Wait for the specified time + buffer
                        await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));

                        // Resume status
                        await prisma.bulkUpdateProgress.update({
                            where: { id: progress.id },
                            data: {
                                status: 'running',
                                retry_after: null
                            }
                        });

                        // Continue loop without decrementing retries to try again
                        continue;
                    }

                    retries--;

                    if (retries > 0) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;
                    }

                    // Final Failure for this plugin
                    results.failed++;
                    results.details.push({ plugin: plugin.name, status: 'failed', error: error.message });

                    // Update DB Progress - Failed
                    await prisma.bulkUpdateProgress.update({
                        where: { id: progress.id },
                        data: { failed: { increment: 1 } }
                    });

                    if (io) {
                        io.to(`server:${serverId}`).emit('plugin:update:progress', {
                            serverId,
                            pluginName: plugin.name,
                            current: results.success + results.failed,
                            total: results.total,
                            status: 'failed',
                            error: error.message
                        });
                    }
                    break; // Exit retry loop
                }
            }
        }

        // Finalize DB Progress
        await prisma.bulkUpdateProgress.update({
            where: { id: progress.id },
            data: {
                status: results.failed > 0 ? 'completed_with_errors' : 'completed',
                current_plugin: null
            }
        });

        try {
            const server = await prisma.server.findUnique({ where: { id: serverId }, select: { name: true } });
            if (server) {
                webhookService.dispatch(serverId, 'plugin:bulk:completed', {
                    serverName: server.name,
                    success: results.success,
                    failed: results.failed,
                    total: results.total
                });
            }
        } catch (e) { console.error('Error fetching server name for webhook', e); }

        return results;
    }

    /**
     * Install a plugin from the marketplace
     */
    async installPlugin(serverId: string, data: { source_type: string, source_id: string, source_url?: string }) {
        const { source_type, source_id, source_url } = data;

        const server = await prisma.server.findUnique({
            where: { id: serverId }
        });

        if (!server) throw new Error('Server not found');

        let downloadUrl = source_url;
        let filename = '';
        let name = '';
        let version = 'unknown';

        const marketplaceService = require('./marketplace.service').default;

        if (source_type === 'spigot') {
            downloadUrl = await marketplaceService.getDownloadUrlSpigot(source_id);
            const ver = await marketplaceService.getLatestVersionSpigot(source_id);
            version = ver || 'unknown';
            name = `Spigot-${source_id}`;
            filename = `${name}.jar`;
        } else if (source_type === 'modrinth') {
            downloadUrl = await marketplaceService.getDownloadUrlModrinth(source_id);
            const ver = await marketplaceService.getLatestVersionModrinth(source_id);
            version = ver || 'unknown';
            name = `Modrinth-${source_id}`;
            filename = `${name}.jar`;
        }

        if (!downloadUrl) {
            throw new Error('Could not resolve download URL');
        }

        console.log(`[PluginService] Installing ${filename} to server ${server.name} from ${downloadUrl}`);

        await fileService.pullFile(server.identifier, downloadUrl, '/plugins', filename, server.path);

        return await prisma.plugin.upsert({
            where: {
                server_id_filename: {
                    server_id: server.id,
                    filename: filename
                }
            },
            update: {
                current_version: version,
                latest_version: version,
                source_type: source_type,
                source_id: source_id,
                is_managed: true,
                last_checked: new Date()
            },
            create: {
                server_id: server.id,
                name: name,
                filename: filename,
                current_version: version,
                latest_version: version,
                source_type: source_type,
                source_id: source_id,
                is_managed: true,
                last_checked: new Date()
            }
        });
    }

    /**
     * Delete a plugin
     */
    async deletePlugin(pluginId: string) {
        const plugin = await prisma.plugin.findUnique({
            where: { id: pluginId },
            include: { server: true }
        });

        if (!plugin) throw new Error('Plugin not found');

        console.log(`[PluginService] Deleting plugin ${plugin.filename} from server ${plugin.server.name}`);

        try {
            await fileService.deleteFile(plugin.server.identifier, `/plugins/${plugin.filename}`, plugin.server.path);
        } catch (error: any) {
            console.warn(`[PluginService] Failed to delete file ${plugin.filename} on Pterodactyl`, error.message);
        }

        await prisma.plugin.delete({
            where: { id: pluginId }
        });

        return { success: true };
    }

    /**
     * Deep scan for plugins (Download & Hash)
     */
    async deepScan(serverId: string) {
        console.log(`Starting Deep Scan for server: ${serverId}`);
        const crypto = require('crypto');

        const server = await prisma.server.findUnique({
            where: { id: serverId },
        });
        if (!server) throw new Error('Server not found');

        const files = await fileService.listFiles(server.identifier, 'plugins', server.path);
        const jarFiles = files.data.filter(f => f.attributes.name.endsWith('.jar'));

        console.log(`Deep Scan: Found ${jarFiles.length} jar files to process.`);

        const results = {
            total: jarFiles.length,
            matched: 0,
            failed: 0,
            details: [] as any[]
        };

        // Socket for progress
        let io;
        try { io = require('./socket.service').getIO(); } catch (e) { }

        const marketplaceService = require('./marketplace.service').default;

        for (const [index, file] of jarFiles.entries()) {
            const filename = file.attributes.name;
            try {
                if (io) {
                    io.to(`server:${serverId}`).emit('plugin:scan:progress', {
                        serverId,
                        filename,
                        current: index + 1,
                        total: jarFiles.length,
                        status: 'processing'
                    });
                }

                console.log(`Deep Scan: Processing ${filename}...`);

                const stream = await fileService.downloadFileStream(server.identifier, `/plugins/${filename}`, server.path);

                const sha1 = crypto.createHash('sha1');
                const sha512 = crypto.createHash('sha512');

                await new Promise((resolve, reject) => {
                    stream.on('data', (chunk: Buffer) => {
                        sha1.update(chunk);
                        sha512.update(chunk);
                    });
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });

                const sha1Hash = sha1.digest('hex');
                const sha512Hash = sha512.digest('hex');

                console.log(`Deep Scan: ${filename} SHA1=${sha1Hash}`);

                const match = await marketplaceService.findByHash(sha1Hash, sha512Hash);

                if (match) {
                    console.log(`Deep Scan: Matched ${filename} -> ${match.name} (${match.source_type})`);

                    await prisma.plugin.upsert({
                        where: {
                            server_id_filename: {
                                server_id: server.id,
                                filename: filename,
                            }
                        },
                        update: {
                            source_type: match.source_type,
                            source_id: match.id,
                            is_managed: true,
                            current_version: match.supported_versions || 'unknown',
                            latest_version: match.supported_versions || 'unknown',
                            last_checked: new Date()
                        },
                        create: {
                            server_id: server.id,
                            name: match.name,
                            filename: filename,
                            current_version: match.supported_versions || 'unknown',
                            latest_version: match.supported_versions || 'unknown',
                            source_type: match.source_type,
                            source_id: match.id,
                            is_managed: true,
                            last_checked: new Date()
                        }
                    });

                    results.matched++;
                    results.details.push({ filename, matched: true, name: match.name, method: 'hash' });
                } else {
                    console.log(`Deep Scan: Hash no match for ${filename}. Trying filename fallback...`);

                    // Fallback: Name Search
                    const metadata = this.parseFilename(filename);
                    console.log(`Deep Scan: Parsed ${filename} -> Name: ${metadata.name}, Version: ${metadata.version}`);

                    if (metadata.name.length > 2) {
                        const searchResults = await marketplaceService.search(metadata.name);
                        const bestMatch = this.findBestMatch(searchResults, metadata);

                        if (bestMatch) {
                            console.log(`Deep Scan: Filename Matched ${filename} -> ${bestMatch.name} (${bestMatch.source_type})`);
                            await prisma.plugin.upsert({
                                where: {
                                    server_id_filename: {
                                        server_id: server.id,
                                        filename: filename,
                                    }
                                },
                                update: {
                                    source_type: bestMatch.source_type,
                                    source_id: bestMatch.id,
                                    is_managed: true,
                                    current_version: metadata.version || 'unknown',
                                    latest_version: bestMatch.supported_versions || 'unknown',
                                    last_checked: new Date()
                                },
                                create: {
                                    server_id: server.id,
                                    name: bestMatch.name,
                                    filename: filename,
                                    current_version: metadata.version || 'unknown',
                                    latest_version: 'unknown',
                                    source_type: bestMatch.source_type,
                                    source_id: bestMatch.id,
                                    is_managed: true,
                                    last_checked: new Date()
                                }
                            });
                            results.matched++;
                            results.details.push({ filename, matched: true, name: bestMatch.name, method: 'filename' });
                        } else {
                            await this.markAsManual(server.id, filename);
                            results.details.push({ filename, matched: false });
                        }
                    } else {
                        await this.markAsManual(server.id, filename);
                        results.details.push({ filename, matched: false });
                    }
                }

            } catch (error: any) {
                console.error(`Deep Scan: Error processing ${filename}`, error.message);
                results.failed++;
                results.details.push({ filename, error: error.message });
            }
        }

        if (io) {
            io.to(`server:${serverId}`).emit('plugin:scan:completed', results);
        }

        return results;
    }

    private async markAsManual(serverId: string, filename: string) {
        await prisma.plugin.upsert({
            where: {
                server_id_filename: {
                    server_id: serverId,
                    filename: filename,
                }
            },
            update: { source_type: 'manual', is_managed: false },
            create: {
                server_id: serverId,
                name: filename.replace('.jar', ''),
                filename: filename,
                current_version: 'unknown',
                source_type: 'manual',
                is_managed: false
            }
        });
    }

    private parseFilename(filename: string): { name: string, version: string | null } {
        let clean = filename.replace(/\.jar$/, '').replace(/\(\d+\)/, '');

        const match = clean.match(/^([a-zA-Z0-9\s\-_]+?)[-_\s]v?(\d+\.\d+.*)$/);

        if (match) {
            return {
                name: match[1].replace(/[-_]/g, ' ').trim(),
                version: match[2]
            };
        }

        return {
            name: clean.replace(/[-_]/g, ' ').trim(),
            version: null
        };
    }

    private findBestMatch(results: any[], metadata: { name: string, version: string | null }): any | null {
        if (!results || results.length === 0) return null;

        const targetName = metadata.name.toLowerCase();

        const exact = results.find((r: any) => r.name.toLowerCase() === targetName);
        if (exact) return exact;

        const contains = results.find((r: any) =>
            (targetName.length > 5 && r.name.toLowerCase().includes(targetName)) ||
            (r.name.length > 5 && targetName.includes(r.name.toLowerCase()))
        );
        if (contains) return contains;

        return null;
    }

    async installLocalPlugin(serverId: string, version: any) {
        const filePath = version.file_path;
        if (!fs.existsSync(filePath)) {
            throw new Error(`Plugin file not found at ${filePath}`);
        }

        const server = await prisma.server.findUnique({
            where: { id: serverId }
        });

        if (!server) {
            throw new Error(`Server not found: ${serverId}`);
        }

        await fileService.uploadFile(server.identifier, filePath, '/plugins', server.path);

        // Register in database
        const existingPlugin = await prisma.plugin.findFirst({
            where: {
                server_id: serverId,
                OR: [
                    { name: version.plugin.name },
                    { filename: version.filename }
                ]
            }
        });

        if (existingPlugin) {
            return prisma.plugin.update({
                where: { id: existingPlugin.id },
                data: {
                    current_version: version.version,
                    source_type: 'custom',
                    source_id: version.plugin.id,
                    filename: version.filename
                }
            });
        }

        return prisma.plugin.create({
            data: {
                server_id: serverId,
                name: version.plugin.name,
                filename: version.filename,
                current_version: version.version,
                source_type: 'custom',
                source_id: version.plugin.id,
                is_managed: true
            }
        });
    }
}

export default new PluginService();

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Plugin } from '@prisma/client';
import prisma from '../prisma/client';
import pterodactylService from './pterodactyl.service';

const STORAGE_DIR = path.join(__dirname, '../../storage/versions');

class VersionService {
    constructor() {
        if (!fs.existsSync(STORAGE_DIR)) {
            fs.mkdirSync(STORAGE_DIR, { recursive: true });
        }
    }

    /**
     * Get versions for a plugin
     */
    async getVersions(pluginId: string) {
        const versions = await prisma.pluginVersion.findMany({
            where: { plugin_id: pluginId },
            orderBy: { created_at: 'desc' }
        });

        return versions.map(v => ({
            ...v,
            file_size: Number(v.file_size)
        }));
    }

    /**
     * Backup a plugin before update
     */
    async backupPlugin(pluginId: string) {
        const plugin = await prisma.plugin.findUnique({
            where: { id: pluginId },
            include: { server: true }
        });

        if (!plugin) throw new Error('Plugin not found');

        // Check if backup already exists for this version
        const existingBackup = await prisma.pluginVersion.findFirst({
            where: {
                plugin_id: pluginId,
                version: plugin.current_version
            }
        });

        if (existingBackup) {
            console.log(`[VersionService] Backup already exists for ${plugin.name} version ${plugin.current_version}. Skipping.`);
            return;
        }

        const serverIdentifier = plugin.server.identifier;
        const remoteFilePath = `/plugins/${plugin.filename}`;

        try {
            const downloadUrl = await pterodactylService.getDownloadUrl(serverIdentifier, remoteFilePath);

            // Prepare local storage
            const pluginDir = path.join(STORAGE_DIR, plugin.id);
            if (!fs.existsSync(pluginDir)) {
                fs.mkdirSync(pluginDir, { recursive: true });
            }

            const timestamp = Date.now();
            const localFilename = `${timestamp}-${plugin.filename}`;
            const localFilePath = path.join(pluginDir, localFilename);

            const writer = fs.createWriteStream(localFilePath);
            const response = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'stream'
            });

            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(true));
                writer.on('error', reject);
            });

            const stats = fs.statSync(localFilePath);
            await prisma.pluginVersion.create({
                data: {
                    plugin_id: plugin.id,
                    version: plugin.current_version,
                    file_path: localFilename,
                    file_size: stats.size,
                    created_at: new Date()
                }
            });

            console.log(`[VersionService] Backed up ${plugin.name} (${plugin.current_version})`);

            // Keep only last 3 versions
            await this.enforceRetention(plugin.id);

        } catch (error) {
            console.error(`[VersionService] Failed to backup plugin ${plugin.name}:`, error);
        }
    }

    /**
     * Restore a specific version
     */
    async restoreVersion(versionId: string) {
        const version = await prisma.pluginVersion.findUnique({
            where: { id: versionId },
            include: { plugin: { include: { server: true } } }
        });

        if (!version) throw new Error('Version not found');

        const plugin = version.plugin;
        const serverIdentifier = plugin.server.identifier;
        const pluginDir = path.join(STORAGE_DIR, plugin.id);
        const localFilePath = path.join(pluginDir, version.file_path);

        if (!fs.existsSync(localFilePath)) {
            throw new Error('Backup file not found on disk');
        }

        console.log(`[VersionService] Restoring ${plugin.name} to version ${version.version}...`);

        const uploadUrl = await pterodactylService.getUploadUrl(serverIdentifier, '/plugins');

        const fileBuffer = fs.readFileSync(localFilePath);
        await pterodactylService.uploadFileToUrl(uploadUrl, fileBuffer, plugin.filename);

        // Update DB to reflect restored version
        await prisma.plugin.update({
            where: { id: plugin.id },
            data: {
                current_version: version.version
            }
        });

        console.log(`[VersionService] Restored ${plugin.name} successfully.`);
    }

    /**
     * Delete old versions to keep only last 3
     */
    private async enforceRetention(pluginId: string) {
        const versions = await prisma.pluginVersion.findMany({
            where: { plugin_id: pluginId },
            orderBy: { created_at: 'desc' }
        });

        if (versions.length > 3) {
            const toDelete = versions.slice(3);
            const pluginDir = path.join(STORAGE_DIR, pluginId);

            for (const version of toDelete) {
                // Delete file
                const filePath = path.join(pluginDir, version.file_path);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                // Delete DB record
                await prisma.pluginVersion.delete({
                    where: { id: version.id }
                });
                console.log(`[VersionService] Deleted old version ${version.version} for ${pluginId}`);
            }
        }
    }
}

export default new VersionService();

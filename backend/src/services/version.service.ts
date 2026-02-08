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
            // 1. Get download URL
            const downloadUrl = await pterodactylService.getDownloadUrl(serverIdentifier, remoteFilePath);

            // 2. Prepare local storage
            const pluginDir = path.join(STORAGE_DIR, plugin.id);
            if (!fs.existsSync(pluginDir)) {
                fs.mkdirSync(pluginDir, { recursive: true });
            }

            const timestamp = Date.now();
            const localFilename = `${timestamp}-${plugin.filename}`;
            const localFilePath = path.join(pluginDir, localFilename);

            // 3. Download file
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

            // 4. Create DB record
            const stats = fs.statSync(localFilePath);
            await prisma.pluginVersion.create({
                data: {
                    plugin_id: plugin.id,
                    version: plugin.current_version,
                    file_path: localFilename, // Store relative to pluginDir
                    file_size: stats.size,
                    created_at: new Date()
                }
            });

            console.log(`[VersionService] Backed up ${plugin.name} (${plugin.current_version})`);

            // 5. Enforce retention (Keep last 3)
            await this.enforceRetention(plugin.id);

        } catch (error) {
            console.error(`[VersionService] Failed to backup plugin ${plugin.name}:`, error);
            // We might not want to block the update if backup fails, optionally throw
            // throw error; 
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

        // 1. Get upload URL
        // We upload to the plugins directory
        const uploadUrl = await pterodactylService.getUploadUrl(serverIdentifier, '/plugins');

        // 2. Upload file
        const fileBuffer = fs.readFileSync(localFilePath);
        // Note: The filename in the upload will determine the file name on the server.
        // We want to restore it as the ORIGINAL filename (e.g. "WorldEdit.jar"), not "1234-WorldEdit.jar".
        await pterodactylService.uploadFileToUrl(uploadUrl, fileBuffer, plugin.filename);

        // 3. Update DB
        // We update current_version to the restored version
        // We also reset latest_version to null or trigger a check? 
        // If we restore an old version, latest_version might still be valid as "update available".
        await prisma.plugin.update({
            where: { id: plugin.id },
            data: {
                current_version: version.version
                // Don't change latest_version, so it correctly shows as "Update Available" if it's old
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

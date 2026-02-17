import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import axios from 'axios';
import pterodactylService from './pterodactyl.service';
import { PterodactylListResponse, PterodactylFile } from '../types/pterodactyl';

const FILE_ACCESS_MODE = process.env.FILE_ACCESS_MODE || 'direct';
const VOLUMES_PATH = process.env.VOLUMES_PATH || '/pterodactyl-volumes';

class FileService {
    private isDirect(): boolean {
        return FILE_ACCESS_MODE === 'direct';
    }

    /**
     * Resolve a server's volume path from its DB path field.
     * DB stores: /var/lib/pterodactyl/volumes/{uuid}
     * We extract uuid and map to: VOLUMES_PATH/{uuid}
     */
    private resolveServerPath(serverPath: string): string {
        const uuid = path.basename(serverPath);
        return path.join(VOLUMES_PATH, uuid);
    }

    /**
     * List files in a directory
     */
    async listFiles(serverIdentifier: string, directory: string, serverPath?: string): Promise<PterodactylListResponse<PterodactylFile>> {
        if (this.isDirect() && serverPath) {
            const dirPath = path.join(this.resolveServerPath(serverPath), directory);

            try {
                const entries = await fsp.readdir(dirPath);
                const data: PterodactylFile[] = [];

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry);
                    const stats = await fsp.stat(fullPath);
                    data.push({
                        object: 'file_object',
                        attributes: {
                            name: entry,
                            mode: '',
                            mode_bits: '',
                            size: stats.size,
                            is_file: stats.isFile(),
                            is_symlink: stats.isSymbolicLink(),
                            mimetype: stats.isFile() ? 'application/octet-stream' : 'inode/directory',
                            created_at: stats.birthtime.toISOString(),
                            modified_at: stats.mtime.toISOString(),
                        }
                    });
                }

                return {
                    object: 'list',
                    data,
                    meta: { pagination: { total: data.length, count: data.length, per_page: data.length, current_page: 1, total_pages: 1, links: { previous: null, next: null } } }
                };
            } catch (error: any) {
                if (error.code === 'ENOENT') {
                    return { object: 'list', data: [], meta: { pagination: { total: 0, count: 0, per_page: 0, current_page: 1, total_pages: 1, links: { previous: null, next: null } } } };
                }
                throw error;
            }
        }

        return pterodactylService.listFiles(serverIdentifier, directory);
    }

    /**
     * Pull a file from a remote URL to the server's directory
     */
    async pullFile(serverIdentifier: string, url: string, directory: string, filename?: string, serverPath?: string) {
        if (this.isDirect() && serverPath) {
            const dirPath = path.join(this.resolveServerPath(serverPath), directory.replace(/^\//, ''));
            await fsp.mkdir(dirPath, { recursive: true });

            const destFilename = filename || path.basename(new URL(url).pathname);
            const destPath = path.join(dirPath, destFilename);

            const response = await axios.get(url, { responseType: 'arraybuffer', maxRedirects: 5 });
            await fsp.writeFile(destPath, response.data);

            console.log(`[FileService] Direct: Pulled ${destFilename} to ${destPath}`);
            return;
        }

        await pterodactylService.pullFile(serverIdentifier, url, directory, filename);
    }

    /**
     * Delete a file from the server
     */
    async deleteFile(serverIdentifier: string, filePath: string, serverPath?: string) {
        if (this.isDirect() && serverPath) {
            const fullPath = path.join(this.resolveServerPath(serverPath), filePath.replace(/^\//, ''));

            try {
                await fsp.unlink(fullPath);
                console.log(`[FileService] Direct: Deleted ${fullPath}`);
            } catch (error: any) {
                if (error.code !== 'ENOENT') throw error;
                console.warn(`[FileService] File not found: ${fullPath}`);
            }
            return;
        }

        await pterodactylService.deleteFile(serverIdentifier, filePath);
    }

    /**
     * Upload a local file to the server
     */
    async uploadFile(serverIdentifier: string, localFilePath: string, remoteDirectory: string, serverPath?: string) {
        if (this.isDirect() && serverPath) {
            const dirPath = path.join(this.resolveServerPath(serverPath), remoteDirectory.replace(/^\//, ''));
            await fsp.mkdir(dirPath, { recursive: true });

            const filename = path.basename(localFilePath);
            const destPath = path.join(dirPath, filename);

            await fsp.copyFile(localFilePath, destPath);
            console.log(`[FileService] Direct: Uploaded ${filename} to ${destPath}`);
            return;
        }

        await pterodactylService.uploadFile(serverIdentifier, localFilePath, remoteDirectory);
    }

    /**
     * Download a file as a readable stream
     */
    async downloadFileStream(serverIdentifier: string, filePath: string, serverPath?: string): Promise<NodeJS.ReadableStream> {
        if (this.isDirect() && serverPath) {
            const fullPath = path.join(this.resolveServerPath(serverPath), filePath.replace(/^\//, ''));
            return fs.createReadStream(fullPath);
        }

        return pterodactylService.downloadFileStream(serverIdentifier, filePath);
    }

    /**
     * Get file content as string
     */
    async getFileContent(serverIdentifier: string, filePath: string, serverPath?: string): Promise<string> {
        if (this.isDirect() && serverPath) {
            const fullPath = path.join(this.resolveServerPath(serverPath), filePath.replace(/^\//, ''));
            return fsp.readFile(fullPath, 'utf-8');
        }

        return pterodactylService.getFileContent(serverIdentifier, filePath);
    }

    /**
     * Get download URL (direct mode returns a file:// path, API mode returns signed URL)
     */
    async getDownloadUrl(serverIdentifier: string, filePath: string, serverPath?: string): Promise<string> {
        if (this.isDirect() && serverPath) {
            // In direct mode, return the local path — caller will read directly
            return path.join(this.resolveServerPath(serverPath), filePath.replace(/^\//, ''));
        }

        return pterodactylService.getDownloadUrl(serverIdentifier, filePath);
    }

    /**
     * Upload a buffer to the server (used by version restore)
     */
    async uploadBuffer(serverIdentifier: string, buffer: Buffer, filename: string, remoteDirectory: string, serverPath?: string) {
        if (this.isDirect() && serverPath) {
            const dirPath = path.join(this.resolveServerPath(serverPath), remoteDirectory.replace(/^\//, ''));
            await fsp.mkdir(dirPath, { recursive: true });

            const destPath = path.join(dirPath, filename);
            await fsp.writeFile(destPath, buffer);
            console.log(`[FileService] Direct: Uploaded buffer to ${destPath}`);
            return;
        }

        // API mode: get upload URL and push
        const uploadUrl = await pterodactylService.getUploadUrl(serverIdentifier, remoteDirectory);
        await pterodactylService.uploadFileToUrl(uploadUrl, buffer, filename);
    }
}

export default new FileService();

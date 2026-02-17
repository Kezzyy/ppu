import axios, { AxiosInstance } from 'axios';
import { PterodactylListResponse, PterodactylServer, PterodactylFile, PterodactylPowerState } from '../types/pterodactyl';
import { RateLimitError } from '../errors/RateLimitError';

class PterodactylService {
    private client: AxiosInstance;

    constructor() {
        let baseURL = process.env.PTERODACTYL_URL?.trim();
        const apiKey = process.env.PTERODACTYL_API_KEY?.trim();

        if (!baseURL || !apiKey) {
            throw new Error('Pterodactyl configuration missing in .env');
        }

        // Remove trailing slash if present
        if (baseURL.endsWith('/')) {
            baseURL = baseURL.slice(0, -1);
        }

        this.client = axios.create({
            baseURL: baseURL, // Use root URL
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Add response interceptor to handle rate limits
        this.client.interceptors.response.use(
            response => response,
            error => {
                if (error.response?.status === 429) {
                    const retryAfterHeader = error.response.headers['retry-after'];
                    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader) : 60;
                    console.warn(`[PterodactylService] Rate limit hit! Retry-After: ${retryAfter}s`);
                    // RateLimitError is imported at the top
                    return Promise.reject(new RateLimitError(retryAfter));
                }
                return Promise.reject(error);
            }
        );
    }

    /**
     * List all servers the user has access to
     */
    async listServers(): Promise<PterodactylListResponse<PterodactylServer>> {
        const response = await this.client.get<PterodactylListResponse<PterodactylServer>>('/api/client');
        return response.data;
    }

    /**
     * Get server details
     */
    async getServer(serverId: string): Promise<PterodactylServer> {
        const response = await this.client.get<PterodactylServer>(`/api/client/servers/${serverId}`);
        return response.data;
    }

    /**
     * Get server resources/health (RAM, CPU, State)
     */
    async getServerResources(serverId: string): Promise<PterodactylPowerState> {
        const response = await this.client.get<PterodactylPowerState>(`/api/client/servers/${serverId}/resources`);
        return response.data;
    }

    /**
     * Send power action to server
     */
    async setPowerState(serverId: string, signal: 'start' | 'stop' | 'restart' | 'kill') {
        await this.client.post(`/api/client/servers/${serverId}/power`, { signal });
    }

    /**
     * Send command to server console
     */
    async sendCommand(serverId: string, command: string) {
        await this.client.post(`/api/client/servers/${serverId}/command`, { command });
    }

    /**
     * List files in a directory
     */
    async listFiles(serverId: string, directory: string = '/'): Promise<PterodactylListResponse<PterodactylFile>> {
        const encodedDir = encodeURIComponent(directory);
        const response = await this.client.get<PterodactylListResponse<PterodactylFile>>(`/api/client/servers/${serverId}/files/list?directory=${encodedDir}`);
        return response.data;
    }

    /**
     * Get file content
     */
    async getFileContent(serverId: string, filePath: string): Promise<string> {
        const encodedPath = encodeURIComponent(filePath);
        const response = await this.client.get<string>(`/api/client/servers/${serverId}/files/contents?file=${encodedPath}`);
        return response.data;
    }

    /**
     * Pull a file from a remote URL to the server
     */
    async pullFile(serverId: string, url: string, directory: string = '/', filename?: string) {
        await this.client.post(`/api/client/servers/${serverId}/files/pull`, {
            url,
            directory,
            filename
        });
    }

    /**
     * Delete a file
     */
    async deleteFile(serverId: string, filePath: string) {
        // Pterodactyl API expects a 'root' param (directory) and 'files' array
        // We need to parse filePath into root and filename
        const lastSlash = filePath.lastIndexOf('/');
        const root = lastSlash > -1 ? filePath.substring(0, lastSlash) : '/';
        const filename = lastSlash > -1 ? filePath.substring(lastSlash + 1) : filePath;

        await this.client.post(`/api/client/servers/${serverId}/files/delete`, {
            root: root || '/',
            files: [filename]
        });
    }

    /**
     * Get a signed download URL for a file
     */
    async getDownloadUrl(serverId: string, filePath: string): Promise<string> {
        const encodedPath = encodeURIComponent(filePath);
        const response = await this.client.get<{ attributes: { url: string } }>(`/api/client/servers/${serverId}/files/download?file=${encodedPath}`);
        return response.data.attributes.url;
    }

    /**
     * Get a signed upload URL for a directory
     */
    async getUploadUrl(serverId: string, directory: string = '/'): Promise<string> {
        const encodedDir = encodeURIComponent(directory);
        const response = await this.client.get<{ attributes: { url: string } }>(`/api/client/servers/${serverId}/files/upload?directory=${encodedDir}`);
        return response.data.attributes.url;
    }

    /**
     * Upload a file to a signed URL
     */
    async uploadFileToUrl(uploadUrl: string, fileBuffer: Buffer, filename: string) {
        const FormData = require('form-data');
        const form = new FormData();
        form.append('files', fileBuffer, filename);

        // Upload using a fresh axios instance to avoid base URL/auth conflicts
        await axios.post(uploadUrl, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
    }

    /**
     * Upload a local file to the server
     */
    async uploadFile(serverId: string, localFilePath: string, remoteDirectory: string = '/') {
        const uploadUrl = await this.getUploadUrl(serverId, remoteDirectory);
        const fs = require('fs');
        const path = require('path');
        const filename = path.basename(localFilePath);

        if (!fs.existsSync(localFilePath)) {
            throw new Error(`Local file not found: ${localFilePath}`);
        }

        const stream = fs.createReadStream(localFilePath);
        const FormData = require('form-data');
        const form = new FormData();
        form.append('files', stream, filename);

        await axios.post(uploadUrl.replace(/\\/g, ''), form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
    }

    /**
     * Download a file from the server as a stream
     */
    async downloadFileStream(serverId: string, filePath: string): Promise<NodeJS.ReadableStream> {
        const downloadUrl = await this.getDownloadUrl(serverId, filePath);
        const response = await axios.get(downloadUrl, { responseType: 'stream' });
        return response.data;
    }
}

export default new PterodactylService();

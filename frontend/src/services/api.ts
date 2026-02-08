import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { Server, Plugin, PluginVersion, ApiResponse, Schedule, Webhook, LocalPlugin, LocalPluginVersion } from '../types/entities';

// CRITICAL: Use relative path to avoid CSP issues and Vite hardcoding
// Development: localhost:3008
// Production: /api (relative to current domain)
const API_URL = '/api';

const apiClient = axios.create({
    baseURL: API_URL,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to handle 401 (Token Expired)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            useAuthStore.getState().logout();
            // Redirect will happen because AuthWrapper/ProtectedRoute watches the state
        }
        return Promise.reject(error);
    }
);

export const serverService = {
    getAll: async (): Promise<Server[]> => {
        const response = await apiClient.get<ApiResponse<Server[]>>('/servers');
        return response.data.data;
    },

    updateOrder: async (orders: { id: string, order: number }[]): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>('/servers/reorder', { orders });
        return response.data;
    },

    sync: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/servers/sync');
        return response.data;
    },

    getPlugins: async (serverId: string): Promise<Plugin[]> => {
        const response = await apiClient.get<ApiResponse<Plugin[]>>(`/servers/${serverId}/plugins`);
        return response.data.data;
    },

    getHealthHistory: async (serverId: string, limit: number = 288): Promise<any[]> => {
        const response = await apiClient.get<ApiResponse<any[]>>(`/servers/${serverId}/health?limit=${limit}`);
        return response.data.data;
    },

    scanPlugins: async (serverId: string): Promise<ApiResponse<Plugin[]>> => {
        const response = await apiClient.post<ApiResponse<Plugin[]>>(`/servers/${serverId}/plugins/scan`);
        return response.data;
    },

    deepScanPlugins: async (serverId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>(`/plugins/server/${serverId}/deep-scan`);
        return response.data;
    },

    updatePlugin: async (pluginId: string, data: Partial<Plugin>): Promise<ApiResponse<Plugin>> => {
        const response = await apiClient.patch<ApiResponse<Plugin>>(`/plugins/${pluginId}`, data);
        return response.data;
    },

    checkUpdates: async (serverId: string): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.post<ApiResponse<any[]>>(`/plugins/server/${serverId}/check-updates`);
        return response.data;
    },

    installPlugin: async (serverId: string, data: { source_type: string, source_id: string, source_url?: string }): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>(`/plugins/server/${serverId}/install`, data);
        return response.data;
    },

    deletePlugin: async (pluginId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete<ApiResponse<any>>(`/plugins/${pluginId}`);
        return response.data;
    },

    installUpdate: async (pluginId: string): Promise<ApiResponse<Plugin>> => {
        const response = await apiClient.post<ApiResponse<Plugin>>(`/plugins/${pluginId}/update`);
        return response.data;
    },

    installAllUpdates: async (serverId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>(`/plugins/server/${serverId}/update-all`);
        return response.data;
    },

    getBulkUpdateProgress: async (serverId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.get<ApiResponse<any>>(`/plugins/server/${serverId}/bulk-progress`);
        return response.data;
    },

    getVersions: async (pluginId: string): Promise<ApiResponse<PluginVersion[]>> => {
        const response = await apiClient.get<ApiResponse<PluginVersion[]>>(`/versions/${pluginId}`);
        return response.data;
    },

    rollbackVersion: async (versionId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>(`/versions/${versionId}/rollback`);
        return response.data;
    }
};

export const pluginService = {
    scanNetwork: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>('/plugins/scan-network');
        return response.data;
    },
    updateNetwork: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.post<ApiResponse<any>>('/plugins/update-network');
        return response.data;
    }
};

export const marketplaceService = {
    search: async (query: string, platform: 'all' | 'spigot' | 'modrinth' = 'all', page: number = 1, sort: string = 'relevance', category: string = 'all', loader: string = 'all') => {
        const response = await apiClient.get<ApiResponse<any[]>>(`/marketplace/search`, {
            params: { q: query, platform, page, sort, category, loader }
        });
        return response.data;
    }
};

export const scheduleService = {
    getAll: async (serverId: string): Promise<Schedule[]> => {
        const response = await apiClient.get<ApiResponse<Schedule[]>>(`/servers/${serverId}/schedules`);
        return response.data.data;
    },
    create: async (serverId: string, data: Partial<Schedule>): Promise<Schedule> => {
        const response = await apiClient.post<ApiResponse<Schedule>>(`/servers/${serverId}/schedules`, data);
        return response.data.data; // Assuming create returns wrapped object
    },
    update: async (id: string, data: Partial<Schedule>): Promise<Schedule> => {
        const response = await apiClient.put<ApiResponse<Schedule>>(`/schedules/${id}`, data);
        return response.data.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/schedules/${id}`);
    }
};

export const webhookService = {
    getAll: async (): Promise<Webhook[]> => {
        const response = await apiClient.get<ApiResponse<Webhook[]>>('/webhooks');
        return response.data.data;
    },
    create: async (data: Partial<Webhook> & { all_servers?: boolean, server_ids?: string[] }): Promise<Webhook> => {
        const response = await apiClient.post<ApiResponse<Webhook>>('/webhooks', data);
        return response.data.data;
    },
    update: async (id: string, data: Partial<Webhook> & { all_servers?: boolean, server_ids?: string[] }): Promise<Webhook> => {
        const response = await apiClient.put<ApiResponse<Webhook>>(`/webhooks/${id}`, data);
        return response.data.data;
    },
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/webhooks/${id}`);
    },
    test: async (event: string, serverId?: string): Promise<any> => {
        const response = await apiClient.post<ApiResponse<any>>('/webhooks/test', { event, serverId });
        return response.data;
    }
};

export const authService = {
    login: async (credentials: any) => {
        const response = await apiClient.post('/auth/login', credentials);
        return response.data;
    },
    getMe: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
    updateProfile: async (data: { username?: string; email?: string }) => {
        const response = await apiClient.put('/auth/profile', data);
        return response.data;
    },
    changePassword: async (data: any) => {
        const response = await apiClient.put('/auth/password', data);
        return response.data;
    },
    uploadAvatar: async (formData: FormData) => {
        const response = await apiClient.post('/auth/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

export const userService = {
    getAll: async () => {
        const response = await apiClient.get('/users');
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await apiClient.post('/users', data);
        return response.data;
    },
    update: async (id: string, data: any) => {
        const response = await apiClient.put(`/users/${id}`, data);
        return response.data;
    },
    delete: async (id: string) => {
        await apiClient.delete(`/users/${id}`);
    }
};

export const auditService = {
    getLogs: async (page: number = 1, limit: number = 20, search: string = '', action: string = '') => {
        const response = await apiClient.get('/audit', {
            params: { page, limit, search, action }
        });
        return response.data;
    }
};

export const customPluginService = {
    getAll: async (): Promise<LocalPlugin[]> => {
        const response = await apiClient.get<ApiResponse<LocalPlugin[]>>('/custom-plugins');
        return response.data.data;
    },
    create: async (data: Partial<LocalPlugin>): Promise<LocalPlugin> => {
        const response = await apiClient.post<ApiResponse<LocalPlugin>>('/custom-plugins', data);
        return response.data.data;
    },
    uploadVersion: async (pluginId: string, version: string, file: File): Promise<LocalPluginVersion> => {
        const formData = new FormData();
        formData.append('version', version);
        formData.append('file', file);

        const response = await apiClient.post<ApiResponse<LocalPluginVersion>>(`/custom-plugins/${pluginId}/versions`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
        return response.data.data;
    },
    delete: async (pluginId: string): Promise<void> => {
        await apiClient.delete(`/custom-plugins/${pluginId}`);
    },
    deleteVersion: async (versionId: string): Promise<void> => {
        await apiClient.delete(`/custom-plugins/versions/${versionId}`);
    },
    deploy: async (versionId: string, serverIds: string[]): Promise<any> => {
        const response = await apiClient.post<ApiResponse<any>>(`/custom-plugins/versions/${versionId}/deploy`, { serverIds });
        return response.data;
    }
};

export interface Server {
    id: string;
    pterodactyl_id: number;
    name: string;
    status: string;
    path: string;
    last_sync: string | null;
    last_health_check: string | null;
    display_order: number;
}

export interface Plugin {
    id: string;
    server_id: string;
    name: string;
    current_version: string;
    latest_version: string | null;
    filename: string;
    icon_url: string | null;
    description: string | null;
    source_type: string;
    source_id: string | null;
    is_managed: boolean;
    auto_update: boolean;
    last_checked: string;
}

export interface PluginVersion {
    id: string;
    plugin_id: string;
    version: string;
    file_size: number;
    created_at: string;
}

export interface Schedule {
    id: string;
    name: string;
    server_id: string;
    cron_expression: string;
    task_type: 'UPDATE_ALL' | 'BACKUP_ALL' | 'RESTART_SERVER';
    is_active: boolean;
    last_run: string | null;
    next_run?: string | null;
}

export interface Webhook {
    id: string;
    name: string;
    url: string;
    type: 'discord' | 'slack' | 'custom';
    events: string[];
    is_active: boolean;
    all_servers: boolean;
    servers?: Server[]; // For UI purposes
    created_at: string;
}

export interface ApiResponse<T> {
    status: 'success' | 'fail' | 'error';
    data: T;
    message?: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: string | Role;
    avatar_url?: string;
    created_at?: string;
    last_login?: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
}

export interface LocalPlugin {
    id: string;
    name: string;
    description: string | null;
    author: string | null;
    created_at: string;
    updated_at: string;
    versions: LocalPluginVersion[];
}

export interface LocalPluginVersion {
    id: string;
    plugin_id: string;
    version: string;
    filename: string;
    file_size: number;
    created_at: string;
}

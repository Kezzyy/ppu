export interface PterodactylServer {
    object: 'server';
    attributes: {
        server_owner: boolean;
        identifier: string;
        internal_id: number;
        uuid: string;
        name: string;
        node: string;
        sftp_details: {
            ip: string;
            port: number;
        };
        description: string;
        limits: {
            memory: number;
            swap: number;
            disk: number;
            io: number;
            cpu: number;
        };
        feature_limits: {
            databases: number;
            allocations: number;
            backups: number;
        };
        is_suspended: boolean;
        is_installing: boolean;
        relationships?: {
            allocations?: {
                object: 'list';
                data: any[];
            };
        };
    };
}

export interface PterodactylListResponse<T> {
    object: 'list';
    data: T[];
    meta: {
        pagination: {
            total: number;
            count: number;
            per_page: number;
            current_page: number;
            total_pages: number;
            links: {
                previous: string | null;
                next: string | null;
            };
        };
    };
}

export interface PterodactylFile {
    object: 'file_object';
    attributes: {
        name: string;
        mode: string;
        mode_bits: string;
        size: number;
        is_file: boolean;
        is_symlink: boolean;
        mimetype: string;
        created_at: string;
        modified_at: string;
    };
}

export interface PterodactylPowerState {
    object: 'power_state';
    attributes: {
        current_state: 'offline' | 'starting' | 'running' | 'stopping';
        is_suspended: boolean;
        resources: {
            memory_bytes: number;
            cpu_absolute: number;
            disk_bytes: number;
            network_rx_bytes: number;
            network_tx_bytes: number;
            uptime: number;
        };
    };
}

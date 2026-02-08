
import prisma from '../prisma/client';
import pterodactylService from './pterodactyl.service';

class MetricsService {

    /**
     * Collect metrics for a single server
     */
    async collectMetrics(serverId: string) {
        try {
            const server = await prisma.server.findUnique({
                where: { id: serverId },
                select: { id: true, identifier: true, name: true }
            });

            if (!server || !server.identifier) {
                console.warn(`[Metrics] Server ${serverId} not found or missing identifier`);
                return;
            }

            // Fetch resources from Pterodactyl
            const stats = await pterodactylService.getServerResources(server.identifier);
            // We also need limits which are found in the server details, not resources
            const serverDetails = await pterodactylService.getServer(server.identifier);

            const attributes = stats.attributes;
            const limits = serverDetails.attributes.limits;

            // Determine status based on resources
            let status = 'healthy';

            // limits.memory is in MB. memory_bytes is in Bytes.
            if (limits.memory > 0) {
                const memoryLimitBytes = limits.memory * 1024 * 1024;
                const usage = (attributes.resources.memory_bytes / memoryLimitBytes) * 100;
                if (usage > 90) status = 'critical';
                else if (usage > 80) status = 'warning';
            }

            if (attributes.current_state === 'offline') status = 'offline';

            // Alert Logic
            if (status === 'critical') {
                await import('./alert.service').then(m => m.default.createAlert(server.id, 'high_ram', 'high', `RAM usage is critical (>90%)`));
            } else if (status === 'offline') {
                // Don't alert for offline unless strictly required, usually annoying if manual stop. 
                // Maybe check if it was supposed to be online?
            } else {
                // Resolve high_ram alert if healthy
                await import('./alert.service').then(m => m.default.resolveAlert(server.id, 'high_ram'));
            }

            // Save to DB
            await prisma.serverHealth.create({
                data: {
                    server_id: server.id,
                    tps: 20, // Ptero doesn't give TPS, would need RCON or Plugin. Placeholder.
                    ram_used: BigInt(attributes.resources.memory_bytes),
                    ram_total: BigInt(limits.memory * 1024 * 1024),
                    player_count: 0, // Ptero doesn't give player count in resources API
                    status: status,
                    timestamp: new Date()
                }
            });

            // Update server status cache
            await prisma.server.update({
                where: { id: server.id },
                data: {
                    status: attributes.current_state,
                    last_health_check: new Date()
                }
            });

        } catch (error: any) {
            console.error(`[Metrics] Failed to collect metrics for ${serverId}:`, error.message);
        }
    }

    /**
     * Collect metrics for ALL active servers
     */
    async collectAllMetrics() {
        console.log('[Metrics] Starting system-wide metrics collection...');
        const servers = await prisma.server.findMany({
            where: { status: { not: 'suspended' } } // Don't check suspended servers
        });

        console.log(`[Metrics] Collecting metrics for ${servers.length} servers...`);

        // Run in batches or sequence to avoid rate limits
        for (const server of servers) {
            await this.collectMetrics(server.id);
        }

        console.log('[Metrics] Collection completed.');
    }
}

export default new MetricsService();

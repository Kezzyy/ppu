
import prisma from '../prisma/client';
import webhookService from './webhook.service';

class AlertService {

    /**
     * Create or update an alert
     */
    async createAlert(serverId: string, type: 'high_ram' | 'crash' | 'offline' | 'plugin_error', severity: 'low' | 'medium' | 'high' | 'critical', message: string) {
        try {
            // Check if active alert of this type already exists to prevent spam
            const existingAlert = await prisma.healthAlert.findFirst({
                where: {
                    server_id: serverId,
                    alert_type: type,
                    resolved_at: null
                }
            });

            if (existingAlert) {
                // Ignore duplicate alerts except crashes
                if (type !== 'crash') {
                    return;
                }
            }

            // Create new alert
            const alert = await prisma.healthAlert.create({
                data: {
                    server_id: serverId,
                    alert_type: type,
                    severity: severity,
                    message: message,
                    notified: false
                },
                include: { server: true }
            });

            // Dispatch webhook notification
            await webhookService.dispatch(serverId, 'server:alert', {
                alert_id: alert.id,
                type: type,
                severity: severity,
                message: message,
                server_name: alert.server.name
            });

            // Mark as notified
            await prisma.healthAlert.update({
                where: { id: alert.id },
                data: { notified: true }
            });

            console.log(`[Alert] Created ${severity} alert for ${alert.server.name}: ${message}`);

        } catch (error: any) {
            console.error('[Alert] Failed to create alert:', error.message);
        }
    }

    /**
     * Resolve an alert
     */
    async resolveAlert(serverId: string, type: string) {
        try {
            await prisma.healthAlert.updateMany({
                where: {
                    server_id: serverId,
                    alert_type: type,
                    resolved_at: null
                },
                data: {
                    resolved_at: new Date()
                }
            });
        } catch (error) {
            // ignore
        }
    }
}

export default new AlertService();

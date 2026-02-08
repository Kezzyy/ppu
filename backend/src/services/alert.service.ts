
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
                // Update existing alert last triggered? Or just ignore if recent?
                // For now, we ignore if it's already active to avoid spamming 
                // UNLESS it's a crash, which is discrete events usually.

                if (type === 'crash') {
                    // Crashes are discrete, but we might want to debounce them if they happen in loops.
                    // Let's create a new one for crash always, but maybe limit frequency in the parser.
                } else {
                    return; // Alert already active
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

            // Dispatch Webhook Notification
            // We use a generic 'server:alert' event or specific ones?
            // WebhookService expects specific events usually found in the array.
            // Let's use 'server:alert'

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

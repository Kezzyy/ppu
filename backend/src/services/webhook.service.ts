import axios from 'axios';
import prisma from '../prisma/client';
import eventService from './event.service';

class WebhookService {

    constructor() {
        this.initializeListeners();
    }

    private initializeListeners() {
        // Plugin events
        eventService.on('plugin:update:success', (payload) => this.dispatch(payload.serverId, 'plugin:update:success', payload));
        eventService.on('plugin:update:failed', (payload) => this.dispatch(payload.serverId, 'plugin:update:failed', payload));
        eventService.on('plugin:bulk:completed', (payload) => this.dispatch(payload.serverId, 'plugin:bulk:completed', payload));

        // Server events
        eventService.on('server:restart', (payload) => this.dispatch(payload.serverId, 'server:restart', payload));
    }

    /**
     * Dispatch an event to all subscribed webhooks for a server
     */
    async dispatch(serverId: string, event: string, payload: any) {
        try {
            const webhooks = await prisma.webhook.findMany({
                where: {
                    is_active: true,
                    OR: [
                        { all_servers: true },
                        { servers: { some: { id: serverId } } }
                    ]
                } as any
            });

            for (const webhook of webhooks) {
                // Cast events from Json to string array
                const events = webhook.events as unknown as string[];
                if (Array.isArray(events) && events.includes(event)) {
                    this.sendWebhook(webhook.url, event, payload, webhook.type).catch(err =>
                        console.error(`[Webhook] Failed to send to ${webhook.id}:`, err.message)
                    );
                }
            }
        } catch (error) {
            console.error('[Webhook] Error fetching webhooks:', error);
        }
    }

    /**
     * Send the actual HTTP request
     */
    private async sendWebhook(url: string, event: string, payload: any, type: string) {
        let body = {};

        if (type === 'discord') {
            body = this.formatDiscordPayload(event, payload);
        } else {
            body = { event, ...payload, timestamp: new Date().toISOString() };
        }

        await axios.post(url, body, { timeout: 5000 });
    }

    /**
     * Format payload for Discord Webhooks
     */
    private formatDiscordPayload(event: string, payload: any) {
        // Customize based on event type
        if (event === 'plugin:update:success') {
            return {
                embeds: [{
                    title: '✅ Plugin Updated Successfully',
                    color: 3066993, // Green
                    fields: [
                        { name: 'Server', value: payload.serverName || 'Unknown Server', inline: true },
                        { name: 'Plugin', value: payload.pluginName, inline: true },
                        { name: 'Version', value: `${payload.oldVersion || 'Old'} ➜ ${payload.newVersion}` }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };
        }

        if (event === 'plugin:update:failed') {
            return {
                embeds: [{
                    title: '❌ Plugin Update Failed',
                    color: 15158332, // Red
                    fields: [
                        { name: 'Server', value: payload.serverName || 'Unknown Server', inline: true },
                        { name: 'Plugin', value: payload.pluginName, inline: true },
                        { name: 'Error', value: payload.error || 'Unknown error' }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };
        }

        if (event === 'plugin:bulk:completed') {
            return {
                embeds: [{
                    title: '📦 Bulk Update Completed',
                    color: 3447003, // Blue
                    description: `Updates completed for server **${payload.serverName}**`,
                    fields: [
                        { name: 'Success', value: payload.success?.toString() || '0', inline: true },
                        { name: 'Failed', value: payload.failed?.toString() || '0', inline: true },
                        { name: 'Total', value: payload.total?.toString() || '0', inline: true }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };
        }

        if (event === 'server:restart') {
            return {
                embeds: [{
                    title: '🔄 Server Restart Initiated',
                    color: 15844367, // Gold/Orange
                    description: `Scheduled restart initiated for **${payload.serverName}**`,
                    timestamp: new Date().toISOString()
                }]
            };
        }

        if (event === 'server:alert') {
            const color = payload.severity === 'critical' ? 15158332 : (payload.severity === 'high' ? 15105570 : 3447003); // Red, Orange, Blue
            return {
                content: payload.severity === 'critical' ? '@everyone' : undefined,
                embeds: [{
                    title: `🚨 Server Alert: ${payload.type.toUpperCase()}`,
                    color: color,
                    description: `**Server:** ${payload.server_name}\n**Message:** ${payload.message}`,
                    fields: [
                        { name: 'Severity', value: payload.severity.toUpperCase(), inline: true }
                    ],
                    timestamp: new Date().toISOString()
                }]
            };
        }

        // Default generic
        return {
            content: `**Event Dispatched**: ${event}`,
            embeds: [{
                description: JSON.stringify(payload, null, 2).substring(0, 4000) // Discord limit
            }]
        };
    }
}

export default new WebhookService();

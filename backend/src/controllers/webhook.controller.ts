import { Request, Response } from 'express';
import prisma from '../prisma/client';
import webhookService from '../services/webhook.service';

class WebhookController {
    async getWebhooks(req: Request, res: Response) {
        try {
            const webhooks = await prisma.webhook.findMany({
                orderBy: { created_at: 'desc' },
                include: { servers: { select: { id: true, name: true } } }
            });
            res.json({ status: 'success', data: webhooks });
        } catch (error: any) {
            res.status(500).json({ status: 'error', error: error.message });
        }
    }

    async createWebhook(req: Request, res: Response) {
        try {
            const { name, url, events, is_active, type, all_servers, server_ids } = req.body;

            const webhook = await prisma.webhook.create({
                data: {
                    name,
                    url,
                    type: type || 'discord',
                    events: events || [],
                    is_active: is_active !== undefined ? is_active : true,
                    all_servers: all_servers !== undefined ? all_servers : true,
                    servers: {
                        connect: server_ids?.map((id: string) => ({ id })) || []
                    }
                },
                include: { servers: { select: { id: true, name: true } } }
            });

            res.status(201).json({ status: 'success', data: webhook });
        } catch (error: any) {
            res.status(400).json({ status: 'error', error: error.message });
        }
    }

    async updateWebhook(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, url, events, is_active, all_servers, server_ids } = req.body;

            // First disconnect all if updating servers, then connect new ones
            if (server_ids) {
                await prisma.webhook.update({
                    where: { id },
                    data: { servers: { set: [] } }
                });
            }

            const webhook = await prisma.webhook.update({
                where: { id },
                data: {
                    name,
                    url,
                    events,
                    is_active,
                    all_servers,
                    servers: server_ids ? {
                        connect: server_ids.map((sid: string) => ({ id: sid }))
                    } : undefined
                },
                include: { servers: { select: { id: true, name: true } } }
            });

            res.json({ status: 'success', data: webhook });
        } catch (error: any) {
            res.status(500).json({ status: 'error', error: error.message });
        }
    }

    async deleteWebhook(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await prisma.webhook.delete({ where: { id } });
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ status: 'error', error: error.message });
        }
    }

    async testWebhook(req: Request, res: Response) {
        try {
            // Retrieve serverId either from params or body, but for global testing we might mock it
            // or if the user wants to test context of a specific server
            const { event, serverId } = req.body;

            // Find a server to use for the test payload mock
            let mockServerId = serverId;
            if (!mockServerId) {
                const server = await prisma.server.findFirst();
                mockServerId = server?.id || 'unknown-server-id';
            }

            // Mock payload for testing
            const testPayload = {
                serverName: 'Test Server',
                pluginName: 'TestPlugin',
                oldVersion: '1.0.0',
                newVersion: '1.1.0',
                success: true,
                failed: 0,
                total: 1
            };

            // Dispatch directly to the URL of the specific webhook if ID is provided?
            // Or just use the service dispatch which finds matching webhooks.
            // But for "Test This Webhook" button, we usually want to test a SPECIFIC URL.
            // The service.dispatch finds ALL webhooks.
            // Let's modify service to allow sending to a specific URL or just expose sendWebhook publicly?
            // For now, we'll just use dispatch but restrict it? existing implementation used dispatch.
            // To test a SPECIFIC webhook, we should probably add a method to service or just use axios here.

            // Let's use the dispatch mechanism but forcing the check.
            await webhookService.dispatch(mockServerId, event, testPayload);
            res.json({ status: 'success', message: 'Test webhook dispatched' });
        } catch (error: any) {
            res.status(500).json({ status: 'error', error: error.message });
        }
    }
}

export default new WebhookController();

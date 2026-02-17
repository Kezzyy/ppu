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
            const { event, serverId } = req.body;

            let mockServerId = serverId;
            if (!mockServerId) {
                const server = await prisma.server.findFirst();
                mockServerId = server?.id || 'unknown-server-id';
            }

            const testPayload = {
                serverName: 'Test Server',
                pluginName: 'TestPlugin',
                oldVersion: '1.0.0',
                newVersion: '1.1.0',
                success: true,
                failed: 0,
                total: 1
            };

            await webhookService.dispatch(mockServerId, event, testPayload);
            res.json({ status: 'success', message: 'Test webhook dispatched' });
        } catch (error: any) {
            res.status(500).json({ status: 'error', error: error.message });
        }
    }
}

export default new WebhookController();

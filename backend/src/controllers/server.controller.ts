import { Request, Response, NextFunction } from 'express';
import pterodactylService from '../services/pterodactyl.service';
import prisma from '../prisma/client';
import { auditService } from '../services/audit.service';

export const listServers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const servers = await prisma.server.findMany();
        res.json({ status: 'success', data: servers });
    } catch (error) {
        next(error);
    }
};

export const getServer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const server = await pterodactylService.getServer(id);
        res.json(server);
    } catch (error) {
        next(error);
    }
};

export const getServerResources = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const resources = await pterodactylService.getServerResources(id);
        res.json(resources);
    } catch (error) {
        next(error);
    }
};

export const syncServers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const pteroServers = await pterodactylService.listServers();

        const upsertOperations = pteroServers.data.map(server => {
            return prisma.server.upsert({
                where: { pterodactyl_id: server.attributes.internal_id },
                update: {
                    name: server.attributes.name,
                    identifier: server.attributes.identifier,
                    status: server.attributes.is_suspended ? 'suspended' : 'active',
                    last_sync: new Date(),
                },
                create: {
                    pterodactyl_id: server.attributes.internal_id,
                    identifier: server.attributes.identifier,
                    name: server.attributes.name,
                    status: server.attributes.is_suspended ? 'suspended' : 'active',
                    path: `${process.env.VOLUMES_PATH || '/var/pterodactyl/volumes'}/${server.attributes.uuid}`,
                    last_sync: new Date(),
                }
            });
        });

        await prisma.$transaction(upsertOperations);

        // Log action
        await auditService.logAction(
            (req as any).user?.id,
            'SERVER_SYNC',
            `Synced ${pteroServers.data.length} servers from Pterodactyl`,
            { count: pteroServers.data.length },
            req.ip
        );

        res.json({ status: 'success', message: `Synced ${pteroServers.data.length} servers` });
    } catch (error) {
        next(error);
    }
};

export const getHealthHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { limit } = req.query;

        const history = await prisma.serverHealth.findMany({
            where: { server_id: id },
            orderBy: { timestamp: 'desc' },
            take: limit ? parseInt(limit as string) : 24 * 12
        });

        const serializedHistory = history.map(h => ({
            ...h,
            ram_used: h.ram_used.toString(),
            ram_total: h.ram_total.toString()
        }));

        res.json({ status: 'success', data: serializedHistory });
    } catch (error) {
        next(error);
    }
};

export const reorderServers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { orders } = req.body;

        if (!Array.isArray(orders)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid data format' });
        }

        const updates = orders.map((item: { id: string, order: number }) => {
            return prisma.server.update({
                where: { id: item.id },
                data: { display_order: item.order }
            });
        });

        await prisma.$transaction(updates);

        // Log action
        await auditService.logAction(
            (req as any).user?.id,
            'SERVER_REORDER',
            'Updated server display order',
            null,
            req.ip
        );

        res.json({ status: 'success', message: 'Server order updated' });
    } catch (error) {
        next(error);
    }
};

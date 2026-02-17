import { Request, Response, NextFunction } from 'express';
import pluginService from '../services/plugin.service';
import { pluginQueue } from '../queues/plugin.queue';
import { auditService } from '../services/audit.service';
import prisma from '../prisma/client';

export const getPlugins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;
        const plugins = await pluginService.getPlugins(serverId);
        res.json({ status: 'success', data: plugins });
    } catch (error) {
        next(error);
    }
};

export const scanPlugins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;
        const plugins = await pluginService.scanPlugins(serverId);

        await auditService.logAction(
            (req as any).user?.id,
            'PLUGIN_SCAN',
            `Scanned plugins for server ${serverId}`,
            { serverId, count: plugins.length },
            req.ip
        );

        res.json({ status: 'success', message: `Scanned ${plugins.length} plugins`, data: plugins });
    } catch (error) {
        next(error);
    }
};

export const deepScanPlugins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;

        await pluginQueue.add('deep-scan', { serverId });

        await auditService.logAction(
            (req as any).user?.id,
            'PLUGIN_DEEP_SCAN',
            `Queued deep scan for server ${serverId}`,
            { serverId },
            req.ip
        );

        res.json({ status: 'success', message: 'Deep scan started (this may take a while)' });
    } catch (error) {
        next(error);
    }
};

export const updatePlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pluginId } = req.params;
        const plugin = await pluginService.updatePlugin(pluginId, req.body);

        await auditService.logAction(
            (req as any).user?.id,
            'PLUGIN_UPDATE',
            `Updated plugin ${plugin.name} configuration`,
            { pluginId, updates: Object.keys(req.body) },
            req.ip
        );

        res.json({ status: 'success', data: plugin });
    } catch (error) {
        next(error);
    }
};

export const checkUpdates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;
        const updates = await pluginService.checkUpdates(serverId);
        res.json({ status: 'success', message: `Checked ${updates.length} plugins`, data: updates });
    } catch (error) {
        next(error);
    }
};

export const installUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pluginId } = req.params;
        const pluginBefore = await prisma.plugin.findUnique({ where: { id: pluginId } });

        const plugin = await pluginService.installUpdate(pluginId);

        await auditService.logAction(
            (req as any).user?.id,
            'PLUGIN_INSTALL_UPDATE',
            `Installed update for plugin ${pluginBefore?.name || plugin.name}`,
            { pluginId, newVersion: plugin.current_version },
            req.ip
        );

        res.json({ status: 'success', message: 'Update installed successfully', data: plugin });
    } catch (error) {
        next(error);
    }
};

export const installAllUpdates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;
        const job = await pluginQueue.add('update-all', { serverId });

        await auditService.logAction(
            (req as any).user?.id,
            'PLUGIN_UPDATE_ALL',
            `Queued bulk update for server ${serverId}`,
            { serverId, jobId: job.id },
            req.ip
        );

        res.json({ status: 'success', message: 'Bulk update queued', data: { jobId: job.id, status: 'queued' } });
    } catch (error) {
        next(error);
    }
};

export const getBulkUpdateProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;

        // Get latest progress
        const progress = await prisma.bulkUpdateProgress.findFirst({
            where: { server_id: serverId },
            orderBy: { updated_at: 'desc' }
        });

        if (!progress) {
            return res.json({
                status: 'success',
                data: null
            });
        }

        res.json({
            status: 'success',
            data: {
                total: progress.total,
                completed: progress.completed,
                failed: progress.failed,
                status: progress.status,
                currentPlugin: progress.current_plugin,
                retryAfter: progress.retry_after,
                updatedAt: progress.updated_at
            }
        });
    } catch (error) {
        next(error);
    }
};

export const installPlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { serverId } = req.params;
        const plugin = await pluginService.installPlugin(serverId, req.body);

        await auditService.logAction(
            (req as any).user?.id,
            'PLUGIN_INSTALL',
            `Started installation of new plugin`,
            { serverId, sourceType: req.body.source_type, sourceId: req.body.source_id },
            req.ip
        );

        res.json({ status: 'success', message: 'Plugin installation started', data: plugin });
    } catch (error) {
        next(error);
    }
};

export const deletePlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pluginId } = req.params;
        const plugin = await prisma.plugin.findUnique({ where: { id: pluginId }, include: { server: true } });

        await pluginService.deletePlugin(pluginId);

        if (plugin) {
            await auditService.logAction(
                (req as any).user?.id,
                'PLUGIN_DELETE',
                `Deleted plugin ${plugin.name} from server ${plugin.server.name}`,
                { pluginId, serverId: plugin.server_id },
                req.ip
            );
        }

        res.json({ status: 'success', message: 'Plugin deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const scanNetwork = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const servers = await prisma.server.findMany();
        let queuedCount = 0;

        for (const server of servers) {
            await pluginQueue.add('scan-plugins', { serverId: server.id });
            queuedCount++;
        }

        await auditService.logAction(
            (req as any).user?.id,
            'NETWORK_SCAN',
            `Started network-wide plugin scan`,
            { serverCount: queuedCount },
            req.ip
        );

        res.json({ status: 'success', message: `Started scan for ${queuedCount} servers` });
    } catch (error) {
        next(error);
    }
};

export const updateNetwork = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const servers = await prisma.server.findMany();
        let queuedCount = 0;

        for (const server of servers) {
            await pluginQueue.add('update-all', { serverId: server.id });
            queuedCount++;
        }

        await auditService.logAction(
            (req as any).user?.id,
            'NETWORK_UPDATE',
            `Started network-wide plugin update`,
            { serverCount: queuedCount },
            req.ip
        );

        res.json({ status: 'success', message: `Started update for ${queuedCount} servers` });
    } catch (error) {
        next(error);
    }
};

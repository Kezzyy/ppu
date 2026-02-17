import { Request, Response, NextFunction } from 'express';
// @ts-ignore
import prisma from '../prisma/client';
import fs from 'fs';
import path from 'path';
import pluginService from '../services/plugin.service';
import { auditService } from '../services/audit.service';

const STORAGE_DIR = path.join(__dirname, '../../storage/custom_plugins');

export const listPlugins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const plugins = await prisma.localPlugin.findMany({
            include: {
                versions: {
                    orderBy: { created_at: 'desc' }
                }
            },
            orderBy: { updated_at: 'desc' }
        });
        res.json({ status: 'success', data: plugins });
    } catch (error) {
        next(error);
    }
};

export const createPlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, author } = req.body;

        const existing = await prisma.localPlugin.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ status: 'error', message: 'Plugin with this name already exists' });
        }

        const plugin = await prisma.localPlugin.create({
            data: {
                name,
                description,
                author
            }
        });

        await auditService.logAction(
            (req as any).user?.id,
            'CUSTOM_PLUGIN_CREATE',
            `Created custom plugin ${name}`,
            { pluginId: plugin.id },
            req.ip
        );

        res.json({ status: 'success', data: plugin });
    } catch (error) {
        next(error);
    }
};

export const uploadVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pluginId } = req.params;
        const { version } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }

        const plugin = await prisma.localPlugin.findUnique({ where: { id: pluginId } });
        if (!plugin) {

            fs.unlinkSync(file.path);
            return res.status(404).json({ status: 'error', message: 'Plugin not found' });
        }

        const existingVersion = await prisma.localPluginVersion.findUnique({
            where: {
                plugin_id_version: {
                    plugin_id: pluginId,
                    version: version
                }
            }
        });

        if (existingVersion) {
            fs.unlinkSync(file.path);
            return res.status(400).json({ status: 'error', message: 'Version already exists for this plugin' });
        }

        const pluginDir = path.join(STORAGE_DIR, plugin.name);
        if (!fs.existsSync(pluginDir)) {
            fs.mkdirSync(pluginDir, { recursive: true });
        }

        const textClean = (text: string) => text.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${textClean(plugin.name)}-${textClean(version)}.jar`;
        const destPath = path.join(pluginDir, fileName);

        fs.renameSync(file.path, destPath);

        const versionEntry = await prisma.localPluginVersion.create({
            data: {
                plugin_id: pluginId,
                version: version,
                filename: fileName,
                file_path: destPath,
                file_size: BigInt(file.size)
            }
        });

        await prisma.localPlugin.update({
            where: { id: pluginId },
            data: { updated_at: new Date() }
        });

        await auditService.logAction(
            (req as any).user?.id,
            'CUSTOM_PLUGIN_UPLOAD',
            `Uploaded version ${version} for ${plugin.name}`,
            { pluginId, versionId: versionEntry.id },
            req.ip
        );

        res.json({ status: 'success', data: versionEntry });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
};

export const deletePlugin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pluginId } = req.params;
        const plugin = await prisma.localPlugin.findUnique({ where: { id: pluginId } });

        if (!plugin) return res.status(404).json({ status: 'error', message: 'Plugin not found' });

        const versions = await prisma.localPluginVersion.findMany({ where: { plugin_id: pluginId } });

        for (const v of versions) {
            if (fs.existsSync(v.file_path)) {
                fs.unlinkSync(v.file_path);
            }
        }

        const pluginDir = path.join(STORAGE_DIR, plugin.name);
        if (fs.existsSync(pluginDir)) {
            try { fs.rmdirSync(pluginDir); } catch (e) { }
        }

        await prisma.localPlugin.delete({ where: { id: pluginId } });

        await auditService.logAction(
            (req as any).user?.id,
            'CUSTOM_PLUGIN_DELETE',
            `Deleted custom plugin ${plugin.name}`,
            { pluginId },
            req.ip
        );

        res.json({ status: 'success', message: 'Plugin deleted' });
    } catch (error) {
        next(error);
    }
};

export const deleteVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { versionId } = req.params;
        const version = await prisma.localPluginVersion.findUnique({ where: { id: versionId } });

        if (!version) return res.status(404).json({ status: 'error', message: 'Version not found' });

        if (fs.existsSync(version.file_path)) {
            fs.unlinkSync(version.file_path);
        }

        await prisma.localPluginVersion.delete({ where: { id: versionId } });

        await auditService.logAction(
            (req as any).user?.id,
            'CUSTOM_PLUGIN_VERSION_DELETE',
            `Deleted version ${version.version}`,
            { versionId },
            req.ip
        );

        res.json({ status: 'success', message: 'Version deleted' });
    } catch (error) {
        next(error);
    }
};

export const deployVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { versionId } = req.params;
        const { serverIds } = req.body;

        if (!Array.isArray(serverIds) || serverIds.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No servers selected' });
        }

        const version = await prisma.localPluginVersion.findUnique({
            where: { id: versionId },
            include: { plugin: true }
        });

        if (!version) return res.status(404).json({ status: 'error', message: 'Version not found' });

        const results = [];
        for (const serverId of serverIds) {
            await pluginService.installLocalPlugin(serverId, version);
            results.push({ serverId, status: 'initiated' });
        }

        await auditService.logAction(
            (req as any).user?.id,
            'CUSTOM_PLUGIN_DEPLOY',
            `Deployed ${version.plugin.name} v${version.version} to ${serverIds.length} servers`,
            { versionId, serverIds },
            req.ip
        );

        res.json({ status: 'success', message: 'Deployment initiated', data: results });

    } catch (error) {
        next(error);
    }
};

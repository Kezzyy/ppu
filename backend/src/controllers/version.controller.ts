import { Request, Response, NextFunction } from 'express';
import versionService from '../services/version.service';

export const getVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pluginId } = req.params;
        const versions = await versionService.getVersions(pluginId);
        res.json({ status: 'success', data: versions });
    } catch (error) {
        next(error);
    }
};

export const rollback = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { versionId } = req.params;
        await versionService.restoreVersion(versionId);
        res.json({ status: 'success', message: 'Rolled back successfully' });
    } catch (error) {
        next(error);
    }
};

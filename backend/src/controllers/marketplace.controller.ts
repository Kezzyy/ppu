import { Request, Response, NextFunction } from 'express';
import marketplaceService from '../services/marketplace.service';

export const searchPlugins = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q, platform, page, sort, category, loader } = req.query;

        // Allow empty query if sort is provided (e.g. for "Most Popular")
        if ((!q || typeof q !== 'string') && !sort) {
            return res.status(400).json({ status: 'fail', message: 'Query parameter "q" is required' });
        }

        const platformParam = (platform === 'spigot' || platform === 'modrinth') ? platform : 'all';
        const pageNum = page ? parseInt(page as string) : 1;
        const sortParam = (typeof sort === 'string') ? sort : 'relevance';
        const categoryParam = (typeof category === 'string') ? category : 'all';
        const loaderParam = (typeof loader === 'string') ? loader : 'all';

        const results = await marketplaceService.search(q as string || '', platformParam, pageNum, sortParam, categoryParam, loaderParam);

        res.json({
            status: 'success',
            count: results.length,
            data: results
        });
    } catch (error) {
        next(error);
    }
};

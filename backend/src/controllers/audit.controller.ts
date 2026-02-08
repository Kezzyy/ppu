import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const { search, action, userId } = req.query;

        const where: any = {};

        if (search) {
            where.OR = [
                { action: { contains: search as string, mode: 'insensitive' } },
                { target: { contains: search as string, mode: 'insensitive' } },
                { user: { username: { contains: search as string, mode: 'insensitive' } } }
            ];
        }

        if (action) {
            where.action = action as string;
        }

        if (userId) {
            where.userId = userId as string;
        }

        const [logs, total] = await prisma.$transaction([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            avatar_url: true
                        }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        res.status(200).json({
            status: 'success',
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch audit logs' });
    }
};

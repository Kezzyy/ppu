import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auditService = {
    logAction: async (
        userId: string | null,
        action: string,
        target: string,
        details?: any,
        ipAddress?: string
    ) => {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    target,
                    details: details ? JSON.stringify(details) : null,
                    ipAddress
                }
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }
};

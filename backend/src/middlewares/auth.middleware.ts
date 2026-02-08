import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client';

interface JwtPayload {
    id: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET as string
            ) as JwtPayload;

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                include: { role: true },
            });

            if (!user) {
                return res.status(401).json({ status: 'fail', message: 'User belonging to this token no longer exists.' });
            }

            (req as any).user = user;
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ status: 'fail', message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ status: 'fail', message: 'Not authorized, no token' });
    }
};

export const restrictTo = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        const userRole = user?.role?.name;

        if (!userRole || !roles.some(role => role.toUpperCase() === userRole.toUpperCase())) {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
};

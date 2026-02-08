import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auditService } from '../services/audit.service';

const signToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET!, {
        expiresIn: '90d'
    });
};

export const register = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'fail', message: 'Please provide username and password' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { username } });
        if (existingUser) {
            return res.status(409).json({ status: 'fail', message: 'Username already exists' });
        }

        // Email is optional for now in quick register, or generate a dummy one if required by DB
        // If your schema requires email, you must provide it or update schema
        // Assuming email is required and unique:
        const email = `${username}@example.com`; // Placeholder or require input

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                email, // Added email
                password_hash,
                role: {
                    connect: { name: 'USER' }
                }
            },
            include: { role: true }
        });

        const token = signToken(newUser.id, newUser.role?.name || 'USER');

        await auditService.logAction(newUser.id, 'USER_REGISTER', `User ${newUser.username} registered`, null, req.ip);

        res.status(201).json({
            status: 'success',
            token,
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                    avatar_url: newUser.avatar_url,
                    created_at: newUser.created_at,
                    last_login: newUser.last_login
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to register user' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ status: 'fail', message: 'Please provide username and password' });
    }

    const user = await prisma.user.findUnique({
        where: { username },
        include: { role: true },
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ status: 'fail', message: 'Incorrect username or password' });
    }

    const token = signToken(user.id, user.role?.name || 'USER');

    // Log login action
    await auditService.logAction(user.id, 'USER_LOGIN', `User ${user.username} logged in`, null, req.ip);

    // Update last login
    await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() }
    });

    res.status(200).json({
        status: 'success',
        token,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                avatar_url: user.avatar_url,
                created_at: user.created_at,
                last_login: user.last_login
            }
        }
    });
};

export const getMe = async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (!user) {
        return res.status(404).json({ status: 'fail', message: 'User not found' });
    }

    const userWithRole = user as any;

    res.status(200).json({
        status: 'success',
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: userWithRole.role,
        },
    });
};

export const updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { username, email } = req.body;

    try {
        const updateData: any = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: { select: { name: true } },
                avatar_url: true
            }
        });

        res.status(200).json({
            status: 'success',
            data: updatedUser
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update profile' });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
            return res.status(401).json({ status: 'fail', message: 'Incorrect current password' });
        }

        const password_hash = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password_hash }
        });

        res.status(200).json({ status: 'success', message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update password' });
    }
};

export const uploadUserAvatar = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    if (!req.file) {
        return res.status(400).json({ status: 'fail', message: 'No file uploaded' });
    }

    // Construct URL (Assuming server runs on same host/port or configured base URL)
    // In production, this should use an ENV variable for the base URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatar_url: avatarUrl },
            select: {
                id: true,
                username: true,
                email: true,
                role: { select: { name: true } },
                avatar_url: true
            }
        });

        res.status(200).json({
            status: 'success',
            data: updatedUser
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update avatar' });
    }
};

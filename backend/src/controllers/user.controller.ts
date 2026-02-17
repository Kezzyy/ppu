import { Request, Response } from 'express';
import prisma from '../prisma/client';
import bcrypt from 'bcrypt';
import { auditService } from '../services/audit.service';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: {
                    select: { name: true }
                },
                created_at: true,
                last_login: true,
                avatar_url: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({
            status: 'success',
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password, role_name } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Missing required fields' });
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(400).json({ status: 'fail', message: 'Username or email already exists' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        let role;
        if (role_name) {
            role = await prisma.role.findUnique({ where: { name: role_name } });
        }

        if (!role) {
            role = await prisma.role.findUnique({ where: { name: 'USER' } });
        }

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password_hash,
                role_id: role?.id,
                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`
            }
        });

        await auditService.logAction(
            (req as any).user?.id,
            'USER_CREATE',
            `Created user ${newUser.username}`,
            { userId: newUser.id, role: role?.name },
            req.ip
        );

        res.status(201).json({
            status: 'success',
            data: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { username, email, password, role_name } = req.body;

        const updateData: any = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        if (role_name) {
            const role = await prisma.role.findUnique({ where: { name: role_name } });
            if (role) {
                updateData.role_id = role.id;
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: { select: { name: true } }
            }
        });

        await auditService.logAction(
            (req as any).user?.id,
            'USER_UPDATE',
            `Updated user ${updatedUser.username}`,
            { userId: updatedUser.id, updates: Object.keys(req.body) },
            req.ip
        );

        res.status(200).json({
            status: 'success',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if ((req as any).user?.id === id) {
            return res.status(400).json({ status: 'fail', message: 'Cannot delete yourself' });
        }

        const userToDelete = await prisma.user.findUnique({ where: { id } });
        await prisma.user.delete({ where: { id } });

        await auditService.logAction(
            (req as any).user?.id,
            'USER_DELETE',
            `Deleted user ${userToDelete?.username || id}`,
            { userId: id },
            req.ip
        );

        res.status(204).send();
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete user' });
    }
};

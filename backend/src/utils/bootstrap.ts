import prisma from '../prisma/client';
import bcrypt from 'bcrypt';

export const bootstrap = async () => {
    try {
        const userCount = await prisma.user.count();

        if (userCount === 0) {
            console.log('No users found. Seeding default admin account...');

            let adminRole = await prisma.role.findUnique({
                where: { name: 'admin' },
            });

            if (!adminRole) {
                adminRole = await prisma.role.create({
                    data: {
                        name: 'admin',
                        permissions: ['*'],
                    },
                });
                console.log('Created default "admin" role.');
            }

            const adminPassword = process.env.ADMIN_PASSWORD || 'password';
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            await prisma.user.create({
                data: {
                    username: process.env.ADMIN_USERNAME || 'admin',
                    email: process.env.ADMIN_EMAIL || 'admin@shimatsu.local',
                    password_hash: hashedPassword,
                    role_id: adminRole.id,
                },
            });

            console.log('================================================');
            console.log('DEFAULT ADMIN ACCOUNT CREATED');
            console.log(`Username: ${process.env.ADMIN_USERNAME || 'admin'}`);
            console.log(`Password: ${adminPassword}`);
            console.log('PLEASE CHANGE THIS PASSWORD IMMEDIATELY!');
            console.log('================================================');
        }
    } catch (error) {
        console.error('Bootstrap failed:', error);
    }
};

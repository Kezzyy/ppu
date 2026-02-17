
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin',
            description: 'Administrator with full access',
            permissions: ["*"]
        }
    });

    console.log(`Created Role: ${adminRole.name}`);

    const hashedPassword = await bcrypt.hash('password', 10);

    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            password_hash: hashedPassword
        },
        create: {
            username: 'admin',
            email: 'admin@example.com',
            password_hash: hashedPassword,
            role_id: adminRole.id
        }
    });

    console.log(`Created/Updated User: ${adminUser.username} (Password: password)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

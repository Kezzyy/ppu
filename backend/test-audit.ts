import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking Audit Logs...');
    const count = await prisma.auditLog.count();
    console.log(`Total Audit Logs: ${count}`);

    if (count === 0) {
        console.log('No logs found. Creating a test log...');
        const user = await prisma.user.findFirst();
        if (user) {
            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'TEST_ACTION',
                    target: 'Test Target',
                    details: JSON.stringify({ message: 'This is a test log' }),
                    ipAddress: '127.0.0.1'
                }
            });
            console.log('Test log created.');
        } else {
            console.log('No users found to link log to.');
        }
    } else {
        const logs = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });
        console.log('Latest 5 logs:', JSON.stringify(logs, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

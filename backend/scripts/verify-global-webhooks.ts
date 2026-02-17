
import { PrismaClient } from '@prisma/client';
import webhookService from '../src/services/webhook.service';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Global Webhooks ---');

    console.log('Cleaning up old test webhooks...');
    await prisma.webhook.deleteMany({ where: { name: { startsWith: 'TEST-GLOBAL' } } });
    await prisma.server.deleteMany({ where: { identifier: 'test-global-verifier' } });

    console.log('Creating global webhook (All Servers)...');
    const globalWebhook = await prisma.webhook.create({
        data: {
            name: 'TEST-GLOBAL-ALL',
            url: 'https://webhook.site/test-all',
            type: 'discord',
            events: ['plugin:update:success'],
            all_servers: true,
            is_active: true
        }
    });
    console.log('Global Webhook Created:', globalWebhook.id);

    let server = await prisma.server.findFirst();
    if (!server) {
        console.log('No server found, creating dummy server...');
        server = await prisma.server.create({
            data: {
                name: 'Test Server',
                pterodactyl_id: 999999,
                identifier: 'test-global-verifier',
                status: 'online',
                path: '/tmp/test-path'
            }
        });
    }

    console.log('Creating specific webhook for server:', server.name);
    const specificWebhook = await prisma.webhook.create({
        data: {
            name: 'TEST-GLOBAL-SPECIFIC',
            url: 'https://webhook.site/test-specific',
            type: 'discord',
            events: ['plugin:update:success'],
            all_servers: false,
            servers: {
                connect: { id: server.id }
            },
            is_active: true
        }
    });
    console.log('Specific Webhook Created:', specificWebhook.id);

    console.log('Testing Dispatch Query Logic...');

    const webhooksForServer = await prisma.webhook.findMany({
        where: {
            is_active: true,
            OR: [
                { all_servers: true },
                { servers: { some: { id: server.id } } }
            ]
        }
    });

    const hasGlobal = webhooksForServer.some(w => w.id === globalWebhook.id);
    const hasSpecific = webhooksForServer.some(w => w.id === specificWebhook.id);

    if (hasGlobal && hasSpecific) {
        console.log('✅ PASS: Dispatch query found both Global and Specific webhooks for target server.');
    } else {
        console.error('❌ FAIL: Dispatch query failed. Global:', hasGlobal, 'Specific:', hasSpecific);
    }

    const randomServerId = 'non-existent-server-id';
    const webhooksForRandom = await prisma.webhook.findMany({
        where: {
            is_active: true,
            OR: [
                { all_servers: true },
                { servers: { some: { id: randomServerId } } }
            ]
        }
    });

    const hasGlobalRandom = webhooksForRandom.some(w => w.id === globalWebhook.id);
    const hasSpecificRandom = webhooksForRandom.some(w => w.id === specificWebhook.id);

    if (hasGlobalRandom && !hasSpecificRandom) {
        console.log('✅ PASS: Dispatch query found ONLY Global webhook for random server.');
    } else {
        console.error('❌ FAIL: Dispatch query failed for random server. Global:', hasGlobalRandom, 'Specific:', hasSpecificRandom);
    }

    console.log('Cleaning up...');
    await prisma.webhook.deleteMany({ where: { name: { startsWith: 'TEST-GLOBAL' } } });
    if (server.identifier === 'test-global-verifier') {
        await prisma.server.delete({ where: { id: server.id } });
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

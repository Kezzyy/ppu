
import eventService from '../src/services/event.service';
import webhookService from '../src/services/webhook.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Event System & Notifications ---');

    // 1. Setup listeners
    console.log('Setting up test listeners...');
    let eventReceived = false;
    eventService.on('server:restart', (payload) => {
        console.log('✅ Event Received:', payload);
        eventReceived = true;
    });

    // 2. Setup a test webhook
    console.log('Creating test webhook...');
    const webhook = await prisma.webhook.create({
        data: {
            name: 'TEST-EVENT-SYSTEM',
            url: 'https://webhook.site/test-event-system', // Mock URL
            type: 'discord',
            events: ['server:restart'],
            all_servers: true
        }
    });

    // 3. Emit event manually
    console.log('Emitting server:restart event...');
    eventService.emit('server:restart', {
        serverId: 'test-server-id',
        serverName: 'Test Server'
    });

    // 4. Verify Dispatch (Mocking sending is hard, but we can verify no errors in dispatch logs)
    // The webhook service listens to the event and should log "Failed to send..." because URL is fake, 
    // but that proves it tried to send!

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (eventReceived) {
        console.log('✅ Event successfully emitted and received by listeners.');
    } else {
        console.error('❌ Event was NOT received by listeners.');
    }

    // Cleanup
    console.log('Cleaning up...');
    await prisma.webhook.delete({ where: { id: webhook.id } });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });

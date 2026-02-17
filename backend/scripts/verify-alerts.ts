
import alertService from '../src/services/alert.service';
import prisma from '../src/prisma/client';
import webhookService from '../src/services/webhook.service';

async function main() {
    console.log('--- Verifying Alert System ---');

    console.log('1. Mocking Webhook Dispatch...');
    const originalDispatch = webhookService.dispatch;
    let dispatchCalled = false;

    (webhookService as any).dispatch = async (serverId: string, event: string, payload: any) => {
        console.log(`✅ Webhook Dispatched: ${event}`, payload);
        dispatchCalled = true;
    };

    console.log('2. Fetching a server...');
    const server = await prisma.server.findFirst();
    if (!server) {
        console.warn('⚠️ No server found. Create one first.');
        return;
    }

    console.log(`Using server: ${server.name}`);

    console.log('3. Triggering Alert...');
    await alertService.createAlert(server.id, 'high_ram', 'medium', 'Test Alert: High RAM Usage');

    console.log('4. Verifying DB...');
    const alert = await prisma.healthAlert.findFirst({
        where: { server_id: server.id, message: 'Test Alert: High RAM Usage' },
        orderBy: { triggered_at: 'desc' }
    });

    if (alert) {
        console.log('✅ Alert found in DB:', alert.id);
    } else {
        console.error('❌ Alert NOT found in DB.');
    }

    if (dispatchCalled) {
        console.log('✅ Webhook dispatch triggered.');
    } else {
        console.error('❌ Webhook dispatch NOT triggered.');
    }

    // Cleanup
    if (alert) {
        await prisma.healthAlert.delete({ where: { id: alert.id } });
    }

    // Restore
    webhookService.dispatch = originalDispatch;
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });

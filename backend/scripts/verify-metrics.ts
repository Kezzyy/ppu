
import metricsService from '../src/services/metrics.service';
import prisma from '../src/prisma/client';

async function main() {
    console.log('--- Verifying Metrics Collection ---');

    console.log('1. Fetching active servers...');
    const servers = await prisma.server.findMany({
        where: { status: { not: 'suspended' } },
        take: 1
    });

    if (servers.length === 0) {
        console.warn('⚠️ No active servers found in DB. Skipping test.');
        return;
    }

    const testServer = servers[0];
    console.log(`Using server: ${testServer.name} (${testServer.identifier})`);

    console.log('2. Collecting metrics...');
    // We need to mock Pterodactyl service or ensure it works with real API if credentials are set
    // Assuming real credentials are in .env as checked before
    try {
        await metricsService.collectMetrics(testServer.id);
        console.log('✅ collectMetrics executed without error.');
    } catch (error: any) {
        console.error('❌ collectMetrics failed:', error.message);
        process.exit(1);
    }

    console.log('3. Verifying DB entry...');
    const healthEntry = await prisma.serverHealth.findFirst({
        where: { server_id: testServer.id },
        orderBy: { timestamp: 'desc' }
    });

    if (healthEntry) {
        console.log('✅ Health entry found:', {
            id: healthEntry.id,
            ram_used: healthEntry.ram_used.toString(), // BigInt
            status: healthEntry.status,
            timestamp: healthEntry.timestamp
        });
    } else {
        console.error('❌ No health entry found in DB!');
    }

    // Cleanup (optional, maybe keep it to see history?)
    // await prisma.serverHealth.delete({ where: { id: healthEntry.id } });
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });

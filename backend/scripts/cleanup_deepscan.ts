
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log('Cleaning up Deep Scan data...');

    const result = await prisma.plugin.updateMany({
        where: {
            source_type: {
                notIn: ['custom', 'manual']
            }
        },
        data: {
            source_type: 'manual',
            source_id: null,
            icon_url: null,
            latest_version: null,
            description: null
        }
    });

    console.log(`Reset ${result.count} plugins to manual state.`);

    const cacheResult = await prisma.marketplaceCache.deleteMany({});
    console.log(`Cleared ${cacheResult.count} cache entries.`);
}

cleanup()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

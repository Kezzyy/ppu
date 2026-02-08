
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log('Cleaning up Deep Scan data...');

    // Reset plugins that are NOT custom (i.e. Spigot/Modrinth/Hangar matches from Deep Scan)
    // We assume 'custom' plugins should be kept as is.
    // 'manual' is the default for unidentified plugins.
    const result = await prisma.plugin.updateMany({
        where: {
            source_type: {
                notIn: ['custom', 'manual'] // Reset anything that claims to be from a repo but might be wrong
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

    // Also clear the cache if needed
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

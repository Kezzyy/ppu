
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPlugins() {
    console.log('Resetting plugin data...');


    await prisma.updateLog.deleteMany({
        where: {
            plugin_id: { not: null }
        }
    });

    await prisma.pluginVersion.deleteMany({});
    const deletedPlugins = await prisma.plugin.deleteMany({});

    console.log(`Deleted ${deletedPlugins.count} plugins.`);

    await prisma.marketplaceCache.deleteMany({});
    console.log('Cleared marketplace cache.');
}

resetPlugins()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

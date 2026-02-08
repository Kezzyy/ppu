
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPlugins() {
    console.log('Resetting plugin data...');

    // Delete all plugins. This will cascade delete versions and update logs if configured, 
    // or we might need to be careful. Schema says:
    // Plugin -> Server (Cascade Delete of Plugin when Server deleted)
    // PluginVersion -> Plugin (Cascade Delete)
    // UpdateLog -> Plugin (Set Null or Delete?) -> checking schema

    // UpdateLog has relation to Plugin. Let's check schema for onDelete on UpdateLog.
    // UpdateLog: plugin Plugin? @relation(fields: [plugin_id], references: [id])
    // No onDelete action specified, defaulting to restricted in some DBs or SetNull if optional. 
    // plugin_id is optional (String?).

    // To be safe, let's delete UpdateLogs regarding plugins first, or just delete Plugins and let Prisma handle it if configured, 
    // but since we want a clean slate for scanning:

    await prisma.updateLog.deleteMany({
        where: {
            plugin_id: { not: null }
        }
    });

    await prisma.pluginVersion.deleteMany({});
    const deletedPlugins = await prisma.plugin.deleteMany({});

    console.log(`Deleted ${deletedPlugins.count} plugins.`);

    // Also clear cache
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

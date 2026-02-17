import { createQueue } from '../config/queue';
import pluginService from '../services/plugin.service';

export const pluginQueue = createQueue('plugin-operations');

pluginQueue.process('update-all', async (job) => {
    const { serverId } = job.data;
    console.log(`[Queue] Processing update-all for server ${serverId} (Job ${job.id})`);

    try {
        const result = await pluginService.installAllUpdates(serverId);
        console.log(`[Queue] Completed update-all for server ${serverId}. Updated: ${result.success}, Failed: ${result.failed}`);
        return result;
    } catch (error) {
        console.error(`[Queue] Failed update-all for server ${serverId}:`, error);
        throw error;
    }
});

pluginQueue.process('scan-plugins', async (job) => {
    const { serverId } = job.data;
    console.log(`[Queue] Processing scan-plugins for server ${serverId} (Job ${job.id})`);

    try {
        const result = await pluginService.scanPlugins(serverId);
        console.log(`[Queue] Completed scan-plugins for server ${serverId}. Found: ${result.length}`);
        return result;
    } catch (error) {
        console.error(`[Queue] Failed scan-plugins for server ${serverId}:`, error);
        throw error;
    }
});

pluginQueue.process('deep-scan', async (job) => {
    const { serverId } = job.data;
    console.log(`[Queue] Processing deep-scan for server ${serverId} (Job ${job.id})`);

    try {
        const result = await pluginService.deepScan(serverId);
        console.log(`[Queue] Completed deep-scan for server ${serverId}. Matched: ${result.matched}`);
        return result;
    } catch (error) {
        console.error(`[Queue] Failed deep-scan for server ${serverId}:`, error);
        throw error;
    }
});

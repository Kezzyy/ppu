
import prisma from '../prisma/client';
import pterodactylService from './pterodactyl.service';
import eventService from './event.service';

class LogParserService {

    // Crash signatures
    private signatures = [
        'Exception in thread "main"',
        'java.lang.OutOfMemoryError',
        'Reported exception thrown!',
        'This crash report has been saved to:',
        'The server has stopped responding! This is (probably) not a Bukkit bug.'
    ];

    /**
     * Check logs for all active servers
     */
    async checkAllLogs() {
        const servers = await prisma.server.findMany({
            where: { status: 'running' }
        });

        for (const server of servers) {
            await this.checkServerLog(server.id, server.identifier, server.name, BigInt((server as any).last_log_offset || 0));
        }
    }

    /**
     * Check log for a single server
     */
    private async checkServerLog(serverId: string, identifier: string, serverName: string, lastOffset: bigint) {
        try {
            const files = await pterodactylService.listFiles(identifier, 'logs');
            const logFile = files.data.find(f => f.attributes.name === 'latest.log');

            if (!logFile) return; // No log file found

            const currentSize = BigInt(logFile.attributes.size);

            if (currentSize <= lastOffset) {
                if (currentSize < lastOffset) {
                    await this.updateOffset(serverId, currentSize);
                }
                return;
            }

            const content = await pterodactylService.getFileContent(identifier, 'logs/latest.log');

            const newContent = content.length > Number(lastOffset) ? content.slice(Number(lastOffset)) : content;

            // Scan for signatures
            for (const sig of this.signatures) {
                if (newContent.includes(sig)) {
                    console.warn(`[LogParser] Crash signature detected on found on ${serverName}: ${sig}`);

                    eventService.emit('server:crash', {
                        serverId,
                        serverName,
                        error: sig,
                        timestamp: new Date()
                    });

                    await import('./alert.service').then(m => m.default.createAlert(serverId, 'crash', 'critical', `Server crash detected: ${sig}`));

                    break;
                }
            }

            await this.updateOffset(serverId, currentSize);

        } catch (error) {
        }
    }

    private async updateOffset(serverId: string, offset: bigint) {
        await prisma.server.update({
            where: { id: serverId },
            data: { last_log_offset: offset } as any
        });
    }
}

export default new LogParserService();

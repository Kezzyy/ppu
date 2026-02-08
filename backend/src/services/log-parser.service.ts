
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
        // console.log('[LogParser] Checking logs for active servers...');
        const servers = await prisma.server.findMany({
            where: { status: 'running' } // Only check running servers
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
            // 1. Get file content. Pterodactyl API limits usually around 32KB-128KB for regular get.
            // For larger files, we might need to "tail" via API or read the whole thing if small.
            // But the API /files/contents endpoint usually returns the *whole* file if small enough, or a chunk.

            // Optimization: We can't actually seek to offset via standard Ptero API easily without downloading.
            // However, typical server logs rotate or aren't massive in the short term.
            // To properly "tail", we'd need to use the websocket or download the file.

            // "File Polling" strategy with standard API:
            // Read "logs/latest.log".
            // If the file is smaller than lastOffset, it means it rotated (server restart/log rotate). Reset offset to 0.
            // If file is larger, read the *difference*.

            // Pterodactyl `getFileContent` returns string. We don't get metadata like size easily without listFiles.
            // Let's list file first to get size.
            const files = await pterodactylService.listFiles(identifier, 'logs');
            const logFile = files.data.find(f => f.attributes.name === 'latest.log');

            if (!logFile) return; // No log file found

            const currentSize = BigInt(logFile.attributes.size);

            if (currentSize <= lastOffset) {
                // File rotated or no new data
                if (currentSize < lastOffset) {
                    // Log rotated, reset offset
                    await this.updateOffset(serverId, currentSize);
                }
                return;
            }

            // Read content
            // The Client API `getFileContent` doesn't support Range headers sadly in the standard wrapper.
            // It just dumps the text.
            // If the log is huge (e.g. 10MB), downloading it all every 5 mins is bad.
            // BUT, Pterodactyl API usually truncates if too large for the response body.

            // Workaround: Use simple `getFileContent`. If it's huge, we process the last X lines.
            // Ideally we'd compare content, but string comparison is heavy.

            const content = await pterodactylService.getFileContent(identifier, 'logs/latest.log');

            // If we have an offset, and we assume the content returned is the *full* file (or tail),
            // we slice it? No, if Ptero returns full text, we can just look at the last chunk.

            // Simplified approach for "Low Performance Impact":
            // Just look at the *end* of the file (last 2KB) for crash signatures.
            // Ignore offset for complex partial reads, just treat "last seen crash" maybe?
            // But user asked for polling.

            // Better approach with Offset:
            // 1. We got new data.
            // 2. We can't strictly "seek" with the basic API call.
            // 3. Let's just scan the *entire* returned body for signatures if it's manageable. 
            //    Or just the substring from `lastOffset` if the string length matches `currentSize`.
            //    (Note: `currentSize` is bytes, string.length is chars. UTF-8 makes this tricky but manageable for ASCII logs).

            // Let's try to slice the string if we can correlate bytes to chars approx, or just scan the new lines.

            const newContent = content.length > Number(lastOffset) ? content.slice(Number(lastOffset)) : content;

            // Scan for signatures
            for (const sig of this.signatures) {
                if (newContent.includes(sig)) {
                    // CRASH DETECTED
                    console.warn(`[LogParser] Crash signature detected on found on ${serverName}: ${sig}`);

                    // Emit event
                    eventService.emit('server:crash', {
                        serverId,
                        serverName,
                        error: sig,
                        timestamp: new Date()
                    });

                    // Trigger Alert
                    await import('./alert.service').then(m => m.default.createAlert(serverId, 'crash', 'critical', `Server crash detected: ${sig}`));

                    // Prevent spamming? 
                    // We only scan "newContent", so we shouldn't re-detect unless it logged again.
                    break;
                }
            }

            // Update offset
            await this.updateOffset(serverId, currentSize);

        } catch (error) {
            // Logs folder might not exist or other error
            // console.error(`[LogParser] Failed to check ${serverName}:`, error);
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

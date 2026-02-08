import * as cron from 'node-cron';
import prisma from '../prisma/client';
import { pluginQueue } from '../queues/plugin.queue';
import eventService from './event.service';
import pterodactylService from './pterodactyl.service';
import metricsService from './metrics.service';
import logParserService from './log-parser.service';

class SchedulerService {
    private jobs: Map<string, cron.ScheduledTask> = new Map();

    /**
     * Initialize all active schedules from the database
     */
    async init() {
        console.log('[Scheduler] Initializing schedules...');

        // 1. User-defined schedules
        const schedules = await prisma.scheduledUpdate.findMany({
            where: { is_active: true }
        });

        for (const schedule of schedules) {
            if (schedule.cron_expression) {
                this.scheduleJob(schedule.id, schedule.cron_expression, schedule.task_type || 'UPDATE_ALL', schedule.server_id || '');
            }
        }

        // 2. System-defined schedules (Metrics & Logs)
        // Metrics: Run every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            await metricsService.collectAllMetrics();
        });

        // Logs: Run every 2 minutes (user requested periodic polling)
        cron.schedule('*/2 * * * *', async () => {
            await logParserService.checkAllLogs();
        });

        // 3. Network-wide Plugin Scan (Daily or Configured)
        const scanInterval = process.env.PLUGIN_SCAN_INTERVAL || '0 0 * * *'; // Default: Midnight daily
        if (cron.validate(scanInterval)) {
            cron.schedule(scanInterval, async () => {
                console.log('[Scheduler] Starting scheduled network-wide plugin scan...');
                try {
                    const servers = await prisma.server.findMany({ select: { id: true } });
                    for (const server of servers) {
                        await pluginQueue.add('scan-plugins', { serverId: server.id });
                    }
                    console.log(`[Scheduler] Queued plugin scan for ${servers.length} servers.`);
                } catch (error) {
                    console.error('[Scheduler] Failed to queue network scan:', error);
                }
            });
            console.log(`[Scheduler] Network scan scheduled with interval: ${scanInterval}`);
        } else {
            console.error(`[Scheduler] Invalid PLUGIN_SCAN_INTERVAL: ${scanInterval}`);
        }

        console.log(`[Scheduler] Loaded ${this.jobs.size} user schedules + 3 system jobs.`);
    }

    /**
     * Schedule a specific job
     */
    private scheduleJob(scheduleId: string, cronExpression: string, taskType: string, serverId: string) {
        // Validate cron expression
        if (!cron.validate(cronExpression)) {
            console.error(`[Scheduler] Invalid cron expression for schedule ${scheduleId}: ${cronExpression}`);
            return;
        }

        // Stop existing job if present (e.g. after update)
        if (this.jobs.has(scheduleId)) {
            this.jobs.get(scheduleId)?.stop();
            this.jobs.delete(scheduleId);
        }

        const task = cron.schedule(cronExpression, async () => {
            console.log(`[Scheduler] Executing scheduled task ${taskType} for schedule ${scheduleId}`);

            try {
                // Update last run time
                await prisma.scheduledUpdate.update({
                    where: { id: scheduleId },
                    data: { last_run: new Date() }
                });

                // Dispatch task to queue or execute directly
                if (taskType === 'UPDATE_ALL' && serverId) {
                    await pluginQueue.add('update-all', { serverId });
                } else if (taskType === 'BACKUP_ALL' && serverId) {
                    // Placeholder for backup-all task
                    console.warn('[Scheduler] BACKUP_ALL task type not yet fully implemented in queue');
                } else if (taskType === 'RESTART_SERVER' && serverId) {
                    console.log(`[Scheduler] Restarting server ${serverId}...`);
                    try {
                        // Get server details for notification
                        const server = await prisma.server.findUnique({
                            where: { id: serverId },
                            select: { name: true, pterodactyl_id: true }
                        });

                        if (server) {
                            // Emit event before action (or after, depending on preference. "Initiated" implies before/during)
                            eventService.emit('server:restart', {
                                serverId,
                                serverName: server.name,
                                timestamp: new Date()
                            });

                            // We need the external UUID or internal ID for ptero service?
                            // PterodactylService.setPowerState takes "serverId" which is usually the client identifier/uuid.
                            // The local DB "id" is a UUID. We need to check if PteroService expects local ID or Ptero ID.
                            // Looking at PterodactylService.getServer, it takes "serverId".
                            // Usually client API uses the "identifier" (short UUID) or "uuid" (long UUID).
                            // My local DB has "identifier". PteroService likely needs that.

                            // Let's check how PterodactylService is used elsewhere or fetch the identifier.
                            const pteroServer = await prisma.server.findUnique({ where: { id: serverId } });
                            if (pteroServer && pteroServer.identifier) {
                                await pterodactylService.setPowerState(pteroServer.identifier, 'restart');
                                console.log(`[Scheduler] Restart signal sent to ${server.name}`);
                            } else {
                                console.error(`[Scheduler] Update failed: Server ${serverId} has no identifier`);
                            }
                        }
                    } catch (err: any) {
                        console.error(`[Scheduler] Failed to restart server ${serverId}:`, err.message);
                    }
                }

            } catch (error) {
                console.error(`[Scheduler] Failed to execute schedule ${scheduleId}:`, error);
            }
        });

        this.jobs.set(scheduleId, task);
    }

    /**
     * Add or Update a schedule
     */
    async saveSchedule(data: {
        id?: string,
        name: string,
        server_id: string,
        cron_expression: string,
        task_type: string,
        is_active: boolean
    }) {
        let schedule;

        if (data.id) {
            schedule = await prisma.scheduledUpdate.update({
                where: { id: data.id },
                data: {
                    name: data.name,
                    server_id: data.server_id,
                    cron_expression: data.cron_expression,
                    task_type: data.task_type,
                    is_active: data.is_active,
                }
            });
        } else {
            schedule = await prisma.scheduledUpdate.create({
                data: {
                    name: data.name,
                    server_id: data.server_id,
                    cron_expression: data.cron_expression,
                    task_type: data.task_type,
                    is_active: data.is_active,
                    schedule_type: 'recurring',
                    status: 'PENDING',
                    target_type: 'server',
                    target_ids: []
                }
            });
        }

        // Manage the cron job
        if (schedule.is_active && schedule.cron_expression) {
            this.scheduleJob(schedule.id, schedule.cron_expression, schedule.task_type || 'UPDATE_ALL', schedule.server_id || '');
        } else {
            // If inactive, remove job
            if (this.jobs.has(schedule.id)) {
                this.jobs.get(schedule.id)?.stop();
                this.jobs.delete(schedule.id);
            }
        }

        return schedule;
    }

    /**
     * Remove a schedule
     */
    async deleteSchedule(id: string) {
        // Stop job
        if (this.jobs.has(id)) {
            this.jobs.get(id)?.stop();
            this.jobs.delete(id);
        }

        // Delete from DB
        await prisma.scheduledUpdate.delete({
            where: { id }
        });
    }
}

export default new SchedulerService();

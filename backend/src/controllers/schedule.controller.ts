import { Request, Response } from 'express';
import prisma from '../prisma/client';
import schedulerService from '../services/scheduler.service';

class ScheduleController {
    async getSchedules(req: Request, res: Response) {
        try {
            const { serverId } = req.params;
            const schedules = await prisma.scheduledUpdate.findMany({
                where: { server_id: serverId },
                orderBy: { created_at: 'desc' }
            });
            res.json(schedules);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    async createSchedule(req: Request, res: Response) {
        try {
            const { serverId } = req.params;
            const { name, cron_expression, task_type, is_active } = req.body;

            const schedule = await schedulerService.saveSchedule({
                name,
                server_id: serverId,
                cron_expression,
                task_type: task_type || 'UPDATE_ALL',
                is_active: is_active !== undefined ? is_active : true
            });

            res.status(201).json(schedule);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateSchedule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, cron_expression, task_type, is_active } = req.body;

            const existing = await prisma.scheduledUpdate.findUnique({ where: { id } });
            if (!existing) return res.status(404).json({ error: 'Schedule not found' });

            const schedule = await schedulerService.saveSchedule({
                id,
                name,
                server_id: existing.server_id || '',
                cron_expression,
                task_type: task_type,
                is_active
            });

            res.json(schedule);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    async deleteSchedule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await schedulerService.deleteSchedule(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default new ScheduleController();

import { Router } from 'express';
import scheduleController from '../controllers/schedule.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/servers/:serverId/schedules', scheduleController.getSchedules);

router.post('/servers/:serverId/schedules', restrictTo('admin', 'user'), scheduleController.createSchedule);

router.put('/schedules/:id', restrictTo('admin', 'user'), scheduleController.updateSchedule);

router.delete('/schedules/:id', restrictTo('admin', 'user'), scheduleController.deleteSchedule);

export default router;

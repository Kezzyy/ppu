import { Router } from 'express';
import scheduleController from '../controllers/schedule.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(protect);

// Get all schedules for a server
router.get('/servers/:serverId/schedules', scheduleController.getSchedules);

// Create a new schedule
router.post('/servers/:serverId/schedules', restrictTo('admin', 'user'), scheduleController.createSchedule);

// Update a schedule
router.put('/schedules/:id', restrictTo('admin', 'user'), scheduleController.updateSchedule);

// Delete a schedule
router.delete('/schedules/:id', restrictTo('admin', 'user'), scheduleController.deleteSchedule);

export default router;

import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import * as auditController from '../controllers/audit.controller';

const router = express.Router();

router.use(protect);
router.use(restrictTo('ADMIN'));

router.get('/', auditController.getAuditLogs);

export default router;

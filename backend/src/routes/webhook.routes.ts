import { Router } from 'express';
import webhookController from '../controllers/webhook.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/webhooks', restrictTo('admin'), webhookController.getWebhooks);

router.post('/webhooks', restrictTo('admin'), webhookController.createWebhook);

router.put('/webhooks/:id', restrictTo('admin'), webhookController.updateWebhook);

router.delete('/webhooks/:id', restrictTo('admin'), webhookController.deleteWebhook);

router.post('/webhooks/test', restrictTo('admin'), webhookController.testWebhook);

export default router;

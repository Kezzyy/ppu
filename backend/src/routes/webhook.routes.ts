import { Router } from 'express';
import webhookController from '../controllers/webhook.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware
router.use(protect);

// Get all webhooks (Global)
router.get('/webhooks', restrictTo('admin'), webhookController.getWebhooks);

// Create a new webhook
router.post('/webhooks', restrictTo('admin'), webhookController.createWebhook);

// Update a webhook
router.put('/webhooks/:id', restrictTo('admin'), webhookController.updateWebhook);

// Delete a webhook
router.delete('/webhooks/:id', restrictTo('admin'), webhookController.deleteWebhook);

// Test a webhook
router.post('/webhooks/test', restrictTo('admin'), webhookController.testWebhook);

export default router;

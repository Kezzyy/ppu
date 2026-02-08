import { Router } from 'express';
import * as CustomPluginController from '../controllers/custom-plugin.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { uploadPlugin } from '../middlewares/upload.middleware';

const router = Router();

// Base path: /api/custom-plugins

router.use(protect); // All routes require auth
router.use(restrictTo('admin')); // All routes require admin for now

router.get('/', CustomPluginController.listPlugins);
router.post('/', CustomPluginController.createPlugin);
router.post('/:pluginId/versions', uploadPlugin.single('file'), CustomPluginController.uploadVersion);
router.delete('/:pluginId', CustomPluginController.deletePlugin);
router.delete('/versions/:versionId', CustomPluginController.deleteVersion);
router.post('/versions/:versionId/deploy', CustomPluginController.deployVersion);

export default router;

import { Router } from 'express';
import * as serverController from '../controllers/server.controller';
import * as pluginController from '../controllers/plugin.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', protect, serverController.listServers);
router.post('/sync', protect, serverController.syncServers);
router.post('/reorder', protect, serverController.reorderServers);
router.get('/:id', protect, serverController.getServer);
router.get('/:id/resources', protect, serverController.getServerResources);
router.get('/:id/health', protect, serverController.getHealthHistory);

router.get('/:serverId/plugins', protect, pluginController.getPlugins);
router.post('/:serverId/plugins/scan', protect, pluginController.scanPlugins);

export default router;

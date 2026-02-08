import { Router } from 'express';
import { updatePlugin, checkUpdates, installUpdate, installAllUpdates, installPlugin, deletePlugin, scanNetwork, updateNetwork, deepScanPlugins, getBulkUpdateProgress } from '../controllers/plugin.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.post('/scan-network', restrictTo('ADMIN'), scanNetwork);
router.post('/update-network', restrictTo('ADMIN'), updateNetwork);

router.patch('/:pluginId', updatePlugin);
router.post('/server/:serverId/check-updates', checkUpdates);
router.post('/server/:serverId/install', installPlugin);
router.post('/:pluginId/update', installUpdate);
router.post('/server/:serverId/update-all', installAllUpdates);
router.get('/server/:serverId/bulk-progress', getBulkUpdateProgress);
router.post('/server/:serverId/deep-scan', deepScanPlugins);
router.delete('/:pluginId', deletePlugin);

export default router;

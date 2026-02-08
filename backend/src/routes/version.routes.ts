import { Router } from 'express';
import { getVersions, rollback } from '../controllers/version.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/:pluginId', getVersions);
router.post('/:versionId/rollback', rollback);

export default router;

import { Router } from 'express';
import { searchPlugins, resolveUrl } from '../controllers/marketplace.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.use(protect);

router.get('/search', searchPlugins);
router.post('/resolve-url', resolveUrl);

export default router;


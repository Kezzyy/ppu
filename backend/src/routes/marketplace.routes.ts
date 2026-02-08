import { Router } from 'express';
import { searchPlugins } from '../controllers/marketplace.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Protect all marketplace routes
router.use(protect);

router.get('/search', searchPlugins);

export default router;

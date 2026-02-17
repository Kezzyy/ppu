import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = express.Router();

router.use(protect);

router.use(restrictTo('ADMIN', 'admin'));

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;

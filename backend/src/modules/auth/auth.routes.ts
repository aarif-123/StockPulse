import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Public auth endpoints
router.post('/login', authController.login);
router.post('/register', authController.register);
``
// Protected identity profile endpoints
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.updatePassword);

export default router;

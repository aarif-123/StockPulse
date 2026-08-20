import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Public auth endpoints
router.post('/login', authController.login);
router.post('/register', authController.register);

// Protected identity profile endpoint
router.get('/me', authenticate, authController.getMe);

export default router;

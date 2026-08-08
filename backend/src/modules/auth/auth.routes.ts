// Auth routes
//
// Mounted at /api/auth in app.ts.
//
// POST /api/auth/login  — public, no middleware required
// GET  /api/auth/me     — requires a valid Bearer token

import { Router } from 'express';
import { login, me } from './auth.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

// Public
router.post('/login', login);

// Protected — authenticate() must run before the me() controller
router.get('/me', authenticate, me);

export default router;

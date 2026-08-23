import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationSlug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = LoginSchema.parse(req.body);
      const data = await authService.login(parsed, req.ip, req.headers['user-agent']);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = RegisterSchema.parse(req.body);
      const data = await authService.register(parsed);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.getMe(req.user!.userId);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone, avatarUrl } = req.body;
      const data = await authService.updateProfile(req.user!.userId, { name, phone, avatarUrl });
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }
      const data = await authService.updatePassword(req.user!.userId, { currentPassword, newPassword });
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  },
};

import { Request, Response, NextFunction } from 'express';
import { OrgRole, NotificationSeverity, NotificationType } from '@prisma/client';
import * as notificationService from './notification.service';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.tenant?.organizationId || (req.headers['x-organization-id'] as string);
    const userId = req.user!.userId;
    const userRole = req.tenant?.role as OrgRole | undefined;

    const unreadOnly = req.query.unread === 'true';
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 25;
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const severity = req.query.severity ? (req.query.severity as NotificationSeverity) : undefined;
    const type = req.query.type ? (req.query.type as NotificationType) : undefined;
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    const data = await notificationService.getUserNotifications(
      organizationId,
      userId,
      userRole,
      {
        unreadOnly,
        page,
        limit,
        search,
        severity,
        type,
        startDate,
        endDate,
        sortOrder,
      }
    );

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.tenant?.organizationId || (req.headers['x-organization-id'] as string);
    const notificationId = req.params.id;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    await notificationService.markAsRead(notificationId, organizationId);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = req.tenant?.organizationId || (req.headers['x-organization-id'] as string);
    const userId = req.user!.userId;
    const userRole = req.tenant?.role as OrgRole | undefined;

    if (!organizationId) {
      res.status(400).json({ error: 'Organization ID is required' });
      return;
    }

    await notificationService.markAllAsRead(organizationId, userId, userRole);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

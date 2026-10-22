import { OrgRole, NotificationType, NotificationSeverity, Prisma } from '@prisma/client';
import prisma from '../../config/database';

export interface CreateNotificationInput {
  organizationId: string;
  userId?: string;
  targetRole?: OrgRole;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  payload?: Prisma.InputJsonValue;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      targetRole: input.targetRole,
      type: input.type,
      severity: input.severity || 'INFO',
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      payload: input.payload || undefined,
    },
  });
}

export async function getUserNotifications(
  organizationId: string,
  userId: string,
  userRole?: OrgRole,
  query?: {
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    severity?: NotificationSeverity;
    type?: NotificationType;
    startDate?: string;
    endDate?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  const { unreadOnly = false, page = 1, limit = 25, search, severity, type, startDate, endDate, sortOrder = 'desc' } = query || {};
  const skip = (page - 1) * limit;

  const OR_CONDITIONS: Prisma.NotificationWhereInput[] = [{ userId }];
  if (userRole) {
    OR_CONDITIONS.push({ targetRole: userRole });
  }

  const createdAtClause: Prisma.DateTimeFilter = {};
  if (startDate) createdAtClause.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    createdAtClause.lte = end;
  }

  const where: Prisma.NotificationWhereInput = {
    organizationId,
    OR: OR_CONDITIONS,
    ...(unreadOnly && { isRead: false }),
    ...(severity && { severity }),
    ...(type && { type }),
    ...((startDate || endDate) && { createdAt: createdAtClause }),
    ...(search && {
      AND: [
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { message: { contains: search, mode: 'insensitive' } },
          ],
        },
      ],
    }),
  };

  const [items, unreadCount, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: sortOrder },
      skip,
      take: limit,
    }),
    prisma.notification.count({
      where: {
        organizationId,
        OR: OR_CONDITIONS,
        isRead: false,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    items,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markAsRead(notificationId: string, organizationId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      organizationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

export async function markAllAsRead(organizationId: string, userId: string, userRole?: OrgRole) {
  const OR_CONDITIONS: Prisma.NotificationWhereInput[] = [{ userId }];
  if (userRole) {
    OR_CONDITIONS.push({ targetRole: userRole });
  }

  return prisma.notification.updateMany({
    where: {
      organizationId,
      OR: OR_CONDITIONS,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

// ── Notification Trigger Helpers ──────────────────────────────────────────────

export async function triggerStockLowNotification(
  organizationId: string,
  productName: string,
  currentStock: number,
  reorderPoint: number,
  productId: string
) {
  const title = `⚠️ Low Stock Warning: ${productName}`;
  const message = `Stock dropped to ${currentStock} units (Below safety threshold: ${reorderPoint}).`;
  const actionUrl = `/products?search=${encodeURIComponent(productName)}`;

  await Promise.all([
    createNotification({
      organizationId,
      targetRole: 'WAREHOUSE',
      type: 'STOCK_LOW',
      severity: 'WARNING',
      title,
      message,
      actionUrl,
      payload: { productId, currentStock, reorderPoint },
    }),
    createNotification({
      organizationId,
      targetRole: 'ORG_ADMIN',
      type: 'STOCK_LOW',
      severity: 'WARNING',
      title,
      message,
      actionUrl,
      payload: { productId, currentStock, reorderPoint },
    }),
  ]);
}

export async function triggerChallanCreatedNotification(
  organizationId: string,
  challanNumber: string,
  customerName: string,
  challanId: string
) {
  await createNotification({
    organizationId,
    targetRole: 'WAREHOUSE',
    type: 'CHALLAN_PENDING',
    severity: 'INFO',
    title: `📦 New Delivery Challan: ${challanNumber}`,
    message: `Challan created for ${customerName}. Dispatch pick & pack required.`,
    actionUrl: `/challans?id=${challanId}`,
    payload: { challanId, challanNumber },
  });
}

export async function triggerChallanConfirmedNotification(
  organizationId: string,
  challanNumber: string,
  customerName: string,
  totalQty: number,
  challanId: string
) {
  await createNotification({
    organizationId,
    targetRole: 'ACCOUNTS',
    type: 'CHALLAN_PENDING',
    severity: 'SUCCESS',
    title: `✅ Delivery Confirmed: ${challanNumber}`,
    message: `Delivery of ${totalQty} units confirmed for ${customerName}. Ready for billing.`,
    actionUrl: `/challans?id=${challanId}`,
    payload: { challanId, challanNumber, totalQty },
  });
}

export async function triggerStockReplenishedNotification(
  organizationId: string,
  productName: string,
  quantityAdded: number,
  newStock: number,
  productId: string
) {
  const title = `📈 Stock Replenished: ${productName}`;
  const message = `Warehouse added ${quantityAdded} units. Total available stock: ${newStock} units.`;
  const actionUrl = `/products?search=${encodeURIComponent(productName)}`;

  await Promise.all([
    createNotification({
      organizationId,
      targetRole: 'SALES',
      type: 'REORDER_RECOMMENDED',
      severity: 'SUCCESS',
      title,
      message,
      actionUrl,
      payload: { productId, quantityAdded, newStock },
    }),
    createNotification({
      organizationId,
      targetRole: 'ORG_ADMIN',
      type: 'REORDER_RECOMMENDED',
      severity: 'INFO',
      title,
      message,
      actionUrl,
      payload: { productId, quantityAdded, newStock },
    }),
  ]);
}

export async function triggerAssemblyBuildNotification(
  organizationId: string,
  assemblyName: string,
  quantityBuilt: number,
  assemblyId: string
) {
  const title = `⚙️ BOM Assembly Ready: ${assemblyName}`;
  const message = `Warehouse completed build run of ${quantityBuilt} units. Ready for sales & shipment.`;
  const actionUrl = `/bom`;

  await Promise.all([
    createNotification({
      organizationId,
      targetRole: 'SALES',
      type: 'ASSEMBLY_READY',
      severity: 'SUCCESS',
      title,
      message,
      actionUrl,
      payload: { assemblyId, quantityBuilt },
    }),
    createNotification({
      organizationId,
      targetRole: 'ORG_ADMIN',
      type: 'ASSEMBLY_READY',
      severity: 'INFO',
      title,
      message,
      actionUrl,
      payload: { assemblyId, quantityBuilt },
    }),
  ]);
}

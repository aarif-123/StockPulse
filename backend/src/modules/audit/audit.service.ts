import { AuditScope, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import logger from '../../utils/logger';

export interface CreateAuditLogInput {
  scope?: AuditScope;
  organizationId?: string | null;
  actorUserId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const auditService = {
  /**
   * Records an immutable audit log entry across PLATFORM, ORGANIZATION, or BUSINESS scopes.
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          scope: input.scope || (input.organizationId ? AuditScope.ORGANIZATION : AuditScope.PLATFORM),
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: input.action,
          resource: input.resource,
          resourceId: input.resourceId,
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (err) {
      // Audit logging failures must not break the primary business transaction, but should be logged
      logger.error({ err, auditPayload: input }, 'Failed to persist audit log entry');
    }
  },

  /**
   * Retrieves platform-level audit logs for Super Admins with search, scope filter, and pagination.
   */
  async getPlatformLogs(search?: string, scope?: AuditScope, page = 1, limit = 50) {
    const where: Prisma.AuditLogWhereInput = {};
    if (scope) {
      where.scope = scope;
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resource: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        { actor: { name: { contains: search, mode: 'insensitive' } } },
        { actor: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Retrieves organization-level audit logs for Organization Admins.
   */
  async getOrganizationLogs(organizationId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { organizationId },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },
};

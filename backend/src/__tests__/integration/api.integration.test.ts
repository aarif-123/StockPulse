import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../app';
import prisma from '../../config/database';

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    organizationMembership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  user: { findUnique: jest.Mock; update: jest.Mock };
  customer: { findMany: jest.Mock; count: jest.Mock };
  organizationMembership: { findMany: jest.Mock; findFirst: jest.Mock };
  subscription: { findFirst: jest.Mock };
  auditLog: { create: jest.Mock };
};

describe('HTTP API End-to-End Integration Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Subsystem', () => {
    it('returns 200 and healthy status when database is reachable', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ 1: 1 }]);

      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        db: 'connected',
      });
      expect(typeof res.body.uptime).toBe('number');
    });

    it('returns 503 and degraded status when database is unreachable', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection timeout'));

      const res = await request(app).get('/api/health');

      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({
        status: 'degraded',
        db: 'unreachable',
      });
    });
  });

  describe('Authentication & Protected Route Guarding', () => {
    it('rejects unauthenticated requests to protected resources with 401', async () => {
      const res = await request(app).get('/api/customers');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        status: 'error',
        message: 'Authentication token is required.',
      });
    });

    it('rejects malformed Bearer tokens with 401', async () => {
      const res = await request(app)
        .get('/api/customers')
        .set('Authorization', 'Bearer invalid.token.structure');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid authentication token.');
    });

    it('authenticates valid credentials and returns JWT token with organizations list', async () => {
      const passwordHash = await bcrypt.hash('Password123!', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash,
        status: 'ACTIVE',
        isSuperAdmin: false,
        memberships: [
          {
            organizationId: 'org_apex',
            role: 'ORG_ADMIN',
            status: 'ACTIVE',
            organization: {
              id: 'org_apex',
              name: 'Apex Logistics',
              slug: 'apex-logistics',
              subscriptions: [
                {
                  status: 'ACTIVE',
                  plan: { name: 'Growth Pro', code: 'growth_v1', allowedFeatures: ['INVENTORY_VALUATION'] },
                },
              ],
            },
          },
        ],
      });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('admin@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.organizations).toHaveLength(1);
    });
  });

  describe('404 Fallback Handler', () => {
    it('returns structured 404 for undefined routes', async () => {
      const res = await request(app).get('/api/undefined-endpoint-xyz');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        status: 'error',
        message: 'Route not found: GET /api/undefined-endpoint-xyz',
      });
    });
  });
});

import bcrypt from 'bcrypt';
import { authService } from '../modules/auth/auth.service';
import prisma from '../config/database';
import * as jwt from '../utils/jwt';
import { UserStatus } from '@prisma/client';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../utils/jwt', () => ({
  signToken: jest.fn(() => 'mock.jwt.token'),
}));

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  auditLog: { create: jest.Mock };
};
const mockSignToken = jwt.signToken as jest.Mock;

const HASHED_PASSWORD = '$2b$12$validhashplaceholder';

const mockUser = {
  id: 'user-1',
  name: 'Test Admin',
  email: 'admin@example.com',
  passwordHash: HASHED_PASSWORD,
  status: UserStatus.ACTIVE,
  isSuperAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  memberships: [
    {
      organizationId: 'org-1',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
      organization: {
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        subscriptions: [
          {
            status: 'ACTIVE',
            plan: { name: 'Growth Pro', code: 'growth_v1', allowedFeatures: [] },
          },
        ],
      },
    },
  ],
};

describe('authService.login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a token, safe user, and organization memberships on valid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const result = await authService.login({ email: 'admin@example.com', password: 'Password123!' });

    expect(result.token).toBe('mock.jwt.token');
    expect(result.user.id).toBe(mockUser.id);
    expect(result.user.email).toBe(mockUser.email);
    expect(result.user.isSuperAdmin).toBe(false);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.organizations).toHaveLength(1);
    expect(mockSignToken).toHaveBeenCalledWith({ userId: mockUser.id, isSuperAdmin: false });
  });

  it('throws 401 for wrong password — same generic message as missing user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(authService.login({ email: 'admin@example.com', password: 'WrongPassword!' })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.',
    });
  });

  it('throws 401 for non-existent email — same generic message as wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(authService.login({ email: 'nobody@example.com', password: 'anything' })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password.',
    });
  });
});

describe('authService.getMe', () => {
  it('returns safe user profile when found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await authService.getMe('user-1');
    expect(result.user.email).toBe('admin@example.com');
  });

  it('throws 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(authService.getMe('non-existent')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

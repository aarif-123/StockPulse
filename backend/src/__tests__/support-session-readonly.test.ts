import { authenticate } from '../middleware/authenticate';
import { verifyToken } from '../utils/jwt';
import { Request, Response } from 'express';

jest.mock('../utils/jwt', () => ({
  verifyToken: jest.fn(),
}));

const mockVerifyToken = verifyToken as jest.Mock;

describe('Support Session Read-Only Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {
        authorization: 'Bearer mock-token',
      },
    };
    res = {};
    next = jest.fn();
  });

  it('allows safe methods (GET) in a support session', () => {
    req.method = 'GET';
    mockVerifyToken.mockReturnValue({
      userId: 'target-user-123',
      isSuperAdmin: false,
      supportSessionId: 'support-session-999',
      impersonatedBy: 'super-admin-456',
    });

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      userId: 'target-user-123',
      isSuperAdmin: false,
      supportSessionId: 'support-session-999',
      impersonatedBy: 'super-admin-456',
    });
  });

  it('blocks unsafe methods (POST, PUT, PATCH, DELETE) in a support session', () => {
    const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    mockVerifyToken.mockReturnValue({
      userId: 'target-user-123',
      isSuperAdmin: false,
      supportSessionId: 'support-session-999',
      impersonatedBy: 'super-admin-456',
    });

    for (const method of unsafeMethods) {
      next.mockClear();
      req.method = method;

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'Read-only mode: Modifications are not permitted during a support session.',
        })
      );
    }
  });

  it('allows all methods for normal users (no supportSessionId)', () => {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    mockVerifyToken.mockReturnValue({
      userId: 'normal-user-123',
      isSuperAdmin: false,
    });

    for (const method of methods) {
      next.mockClear();
      req.method = method;

      authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    }
  });
});

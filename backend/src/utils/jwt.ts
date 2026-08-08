// JWT utility — single place for all token operations.
//
// Keeping sign and verify here means:
// - The algorithm and options are configured once.
// - Controllers and middleware never import jsonwebtoken directly.
// - Swapping the algorithm later is a one-file change.

import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

/** The data embedded in every JWT. Keep this minimal — only what the backend needs. */
export interface JwtPayload {
  userId: string;
  role: Role;
}

/**
 * Signs a new JWT with the application secret and configured expiry.
 * Call this once per successful login.
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies a JWT and returns its typed payload.
 * Throws a `JsonWebTokenError` or `TokenExpiredError` if the token is
 * invalid or expired — the caller is responsible for catching these.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  // jwt.verify returns `string | JwtPayload`; we assert the shape we signed.
  return decoded as JwtPayload;
}

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedUserPayload } from '../types/auth';

export interface JwtPayload extends AuthenticatedUserPayload {}

/**
 * Signs a new JWT containing minimal user identity and superAdmin flag.
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies and decodes a JWT token.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  return decoded as JwtPayload;
}

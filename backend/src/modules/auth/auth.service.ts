// Auth service — pure business logic, no Express types.
//
// Each function has a single responsibility:
//   loginUser   → verify credentials, produce a token
//   getUserById → fetch safe user data for /me
//
// Keeping Express out of this layer means the logic is independently
// testable and easy to reason about.

import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';
import { AppError } from '../../middleware/error-handler';

/**
 * The subset of User fields that are safe to send to clients.
 * passwordHash must NEVER appear here.
 */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Validates credentials and returns a JWT + safe user info.
 *
 * Security notes:
 * - We always compare the hash even when the user isn't found (via a dummy
 *   hash) to prevent timing-based user enumeration attacks.
 * - The error message is intentionally generic — it does not reveal whether
 *   the email exists in the system.
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<{ token: string; user: SafeUser }> {
  // Always run bcrypt.compare to avoid timing-based user enumeration.
  // If the user doesn't exist we compare against a dummy hash so the
  // response time is indistinguishable from a wrong-password case.
  const DUMMY_HASH =
    '$2b$12$invalidhashusedtopreventsidetiminattackswithbcrypt..';

  const user = await prisma.user.findUnique({ where: { email } });

  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordMatch) {
    // Generic message: does not reveal whether the email exists
    const err: AppError = new Error('Invalid email or password.');
    err.statusCode = 401;
    err.isOperational = true;
    throw err;
  }

  const token = signToken({ userId: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Returns safe user data by ID.
 * Used by GET /api/auth/me to return fresh data for the authenticated user.
 * Throws 401 if the user no longer exists (e.g. deleted after token was issued).
 */
export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      // passwordHash is intentionally NOT selected
    },
  });

  if (!user) {
    const err: AppError = new Error('User not found.');
    err.statusCode = 401;
    err.isOperational = true;
    throw err;
  }

  return user;
}

// Express Request augmentation.
//
// This module declaration adds the `user` property to Express's Request type
// so every middleware and controller gets full TypeScript type safety on
// req.user without resorting to `any` or repeated casting.
//
// The property is optional (`?`) because unauthenticated routes also use
// Request — the `authenticate` middleware is what guarantees its presence
// on protected routes.

import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
      };
    }
  }
}

// This empty export is required to make TypeScript treat the file as a
// module rather than a script, which is necessary for declaration merging
// to work correctly.
export {};

import { AuthenticatedUserPayload, TenantContext } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
      tenant?: TenantContext;
    }
  }
}

export {};

import { Router, Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { AppError } from '../../middleware/error-handler';
import { intelligenceChatSchema } from './intelligence.schema';
import { streamIntelligenceChat } from './intelligence.service';

const router = Router();

// ── Per-org rate limit: 15 requests / minute ─────────────────────────────────
// Prefer user ID as the key (more accurate than IP for authenticated routes).
// Falls back to the ipKeyGenerator helper which is IPv6-safe.
const intelligenceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req: Request) =>
    req.user?.userId ?? ipKeyGenerator(req.ip ?? '127.0.0.1'),
  handler: (_req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many Intelligence requests. Please wait a moment before asking again.',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Route handlers ────────────────────────────────────────────────────────────

router.use(authenticate);
router.use(resolveTenantContext);
router.use(intelligenceLimiter);

/**
 * POST /api/intelligence/chat
 *
 * Streams a Groq/Llama intelligence response as Server-Sent Events.
 * Body: { message: string, history?: { role, content }[] }
 *
 * SSE stream format:
 *   data: {"type":"token","content":"..."}\n\n
 *   data: {"type":"done"}\n\n
 *   data: {"type":"error","message":"..."}\n\n
 */
router.post(
  '/chat',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const parsed = intelligenceChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        AppError.badRequest(
          parsed.error.errors.map((e) => e.message).join('. ')
        )
      );
    }

    if (!req.tenant) {
      return next(AppError.unauthorized('Organization context is required.'));
    }

    try {
      await streamIntelligenceChat(
        req.tenant.organizationId,
        req.tenant.role,
        parsed.data,
        res,
        (req as Request & { signal?: AbortSignal }).signal,
      );
    } catch (err) {
      // Only pass to error handler if headers haven't been sent yet
      if (!res.headersSent) {
        next(err);
      }
    }
  }
);

export default router;

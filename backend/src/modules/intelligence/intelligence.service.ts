/**
 * Intelligence Service — READ-ONLY reasoning layer.
 *
 * Responsibilities:
 *  1. Build a compact org-context snapshot from existing analytics functions.
 *  2. Stream a Groq/Llama response to the HTTP response via SSE.
 *
 * Design constraints:
 *  - Never writes to the database. All mutations stay in the action agent.
 *  - Tenant-scoped: every DB call is bounded by organizationId.
 *  - Key rotation: parses GROQ_API_KEY as comma-separated list; round-robins
 *    on each request and retries on 429 / 401.
 */

import type { Response } from 'express';
import Groq, { APIError } from 'groq-sdk';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { getDashboardStats } from '../dashboard/dashboard.service';
import { getReportsAnalytics } from '../reports/reports.service';
import logger from '../../utils/logger';
import type { IntelligenceChatInput } from './intelligence.schema';

// ── Groq API Key Configuration ───────────────────────────────────────────────

const GROQ_KEYS: string[] = env.GROQ_API_KEY
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

if (GROQ_KEYS.length === 0) {
  throw new Error('GROQ_API_KEY is set but contains no valid keys after parsing.');
}

// ── Context builder ──────────────────────────────────────────────────────────

/**
 * Fetches live org data in parallel and shapes it into a compact JSON briefing.
 * Target size: ~2,000–2,500 tokens — well within Llama's 128K context window.
 */
async function buildOrgContextSnapshot(organizationId: string): Promise<string> {
  const [dashboard, analytics, lowStockProducts] = await Promise.all([
    getDashboardStats(organizationId),
    getReportsAnalytics(organizationId, '30d'),
    prisma.product.findMany({
      where: { organizationId },
      select: {
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        unitPrice: true,
      },
      orderBy: { currentStock: 'asc' },
      take: 10,
    }),
  ]);

  const snapshot = {
    period: 'last 30 days',
    kpis: {
      retailValuation: analytics.totalValuation,
      costValuation: analytics.totalCostValuation,
      totalUnits: analytics.totalUnits,
      activeSkus: analytics.activeSkusCount,
      lowStockSkus: analytics.lowStockCount,
      outOfStockSkus: analytics.outOfStockCount,
      grossMarginPct: analytics.grossMarginPercent,
      deadStockCapital: analytics.totalDeadStockCapital,
    },
    inventoryHealth: {
      criticalReorderSkus: analytics.inventoryHealthMatrix.criticalReorder.skuCount,
      criticalReorderExposure: analytics.inventoryHealthMatrix.criticalReorder.capitalExposure,
      healthyBufferSkus: analytics.inventoryHealthMatrix.healthyBuffer.skuCount,
      excessOverstockSkus: analytics.inventoryHealthMatrix.excessOverstock.skuCount,
      excessOverstockExposure: analytics.inventoryHealthMatrix.excessOverstock.capitalExposure,
      deadStockSkus: analytics.inventoryHealthMatrix.deadStockIdle.skuCount,
      deadStockExposure: analytics.inventoryHealthMatrix.deadStockIdle.capitalExposure,
    },
    abcAnalysis: {
      classA: {
        skuCount: analytics.abcAnalysis.classA.skuCount,
        capitalValue: analytics.abcAnalysis.classA.capitalValue,
        percentage: analytics.abcAnalysis.classA.percentage,
      },
      classB: {
        skuCount: analytics.abcAnalysis.classB.skuCount,
        capitalValue: analytics.abcAnalysis.classB.capitalValue,
        percentage: analytics.abcAnalysis.classB.percentage,
      },
      classC: {
        skuCount: analytics.abcAnalysis.classC.skuCount,
        capitalValue: analytics.abcAnalysis.classC.capitalValue,
        percentage: analytics.abcAnalysis.classC.percentage,
      },
    },
    throughput: {
      inwardUnits: analytics.stockFlowMetrics.totalInwardUnits,
      outwardUnits: analytics.stockFlowMetrics.totalOutwardUnits,
      net: analytics.stockFlowMetrics.netThroughput,
    },
    customers: {
      total: dashboard.customers.total,
      active: dashboard.customers.active,
      leads: dashboard.customers.leads,
    },
    challans: {
      draft: dashboard.challans.totalDraft,
      confirmed: dashboard.challans.totalConfirmed,
    },
    stockoutRisk: analytics.stockoutRiskRunway.slice(0, 5).map((p) => ({
      name: p.productName,
      sku: p.sku,
      currentStock: p.currentStock,
      runwayDays: p.estimatedRunwayDays,
    })),
    topFastMoving: analytics.topMovingProducts.slice(0, 5).map((p) => ({
      name: p.productName,
      sku: p.sku,
      sold30d: p.totalQty,
      runwayDays: p.estimatedRunwayDays,
    })),
    deadStock: analytics.deadStockProducts.slice(0, 5).map((p) => ({
      name: p.productName,
      sku: p.sku,
      stock: p.currentStock,
      lockedCost: p.lockedCost,
      idleDays: p.daysWithoutMovement,
    })),
    lowStockSample: lowStockProducts
      .filter((p) => p.currentStock <= p.minimumStock)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.currentStock,
        min: p.minimumStock,
        deficit: Math.max(0, p.minimumStock - p.currentStock),
        unitPrice: Number(p.unitPrice),
      })),
  };

  return JSON.stringify(snapshot, null, 2);
}

// ── Module-level Key Index for True Round-Robin Load Balancing ─────────────
let globalKeyIndex = 0;

function buildSystemPrompt(orgContextJson: string, orgRole: string): string {
  return `You are DOST Intelligence — an expert inventory intelligence, supply-chain diagnostics, and financial operations advisor embedded inside VyaaparSync.
Role Context: ${orgRole}

## RESPONSE CONTRACT & DYNAMIC PRESENTATION
1. ZERO CONVERSATIONAL FILLER: Never start with "Certainly", "Here is an analysis", "Based on the snapshot", "Hello", "Sure", etc. Start immediately with the direct analytical verdict.
2. STRICT CONCISENESS & COMPLETION: Keep the total response under 380 words so all sections (especially Recommended Actions) complete fully and cleanly without hitting token limits.
3. SCANNABLE STRUCTURE (use exactly these markdown headings):
### Executive Verdict
1–2 punchy sentences stating the bottom-line diagnosis, total capital impact (₹), and strategic direction directly answering the user's specific prompt.

### Data Breakdown
Always format as a standard GitHub Flavored Markdown table with leading/trailing pipes and header divider line. Top 3–4 items + 1 Total row. Plain text only inside cells (no asterisks).
Example format:
| SKU | Product | Dormant Qty | Locked Capital | Holding Drag/yr | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-PROD | E2E Product | 170 | ₹1.53Cr | ~₹27.5L | Critical Idle |
| SKU-00005 | Business Laptop i7 Pro | 123 | ₹70.44L | ~₹12.7L | Critical Idle |
| Total | Portfolio Summary | 674 units | ₹4.88Cr | ~₹88.0L | High Risk |

Select relevant columns dynamically matching query intent:
- Stockouts / reorder: SKU | Product | Current Stock | Min Stock | Deficit | Runway | Status
- Dead stock / idle: SKU | Product | Dormant Qty | Locked Capital | Holding Drag/yr | Status
- Fast-moving / velocity: SKU | Product | Sold 30d | Revenue | Runway | Status
- Valuation / overview: Category | SKU Count | Cost Value | % Share | Status

### Key Financial Drivers
Exactly 2 concise bullet points directly addressing the query topic (under 30 words each):
- **[Driver Name]**: [Value] — [Crisp strategic insight]
- **[Driver Name]**: [Value] — [Crisp strategic insight]

### Recommended Actions
Provide exactly 2 highly productive operational directives with an executable command prompt in quotes:
1. **[Action Name]**: [Concise operational instruction]. Action: "[Action command prompt to run, e.g. Show low stock products or Show dead stock in inventory]"
2. **[Action Name]**: [Concise procurement/clearance directive]. Action: "[Action command prompt to run, e.g. Create delivery challan or What is our total inventory valuation?]"

4. STRICT DATA & FINANCIAL GROUNDING:
   - Ground every figure strictly in the live organization snapshot below.
   - HOLDING DRAG RULE: Annual holding drag must ALWAYS be realistically calculated as 16%–20% of locked capital (formula: locked capital * 0.18). Example: ₹1.53Cr capital * 18% ≈ ₹27.5L/yr; ₹4.88Cr capital * 18% ≈ ₹88.0L/yr. Never output holding drag greater than locked capital.
   - Express Indian Rupees in ₹ with K, L, or Cr shorthand (e.g. ₹2.4L, ₹3.69Cr, ₹7.04L).
   - In ### Recommended Actions, EVERY recommendation MUST end with an explicit action prompt in quotes, e.g.: Action: "Create delivery challan" or Action: "Show low stock products" or Action: "Show dead stock in inventory".

## Live Organisation Data Snapshot:
\`\`\`json
${orgContextJson}
\`\`\``;
}

// ── Main streaming function ──────────────────────────────────────────────────

/**
 * Builds the org context ONCE, then streams a Groq response token-by-token
 * directly to the Express response as Server-Sent Events.
 *
 * Features:
 *  - True round-robin key balancing across requests
 *  - AbortController cancellation on client disconnect
 *  - SSE keep-alive comment to prevent proxy timeouts
 *  - Guards against retrying after tokens have already been emitted
 *  - Strongly-typed Groq.APIError inspection
 *
 * SSE format:
 *   : connected
 *   data: {"type":"token","content":"..."}
 *   data: {"type":"done"}
 *   data: {"type":"error","message":"..."}
 */
export async function streamIntelligenceChat(
  organizationId: string,
  orgRole: string,
  input: IntelligenceChatInput,
  res: Response,
  signal?: AbortSignal,
): Promise<void> {
  // Set SSE headers immediately
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send initial SSE keep-alive comment to establish the connection through proxies/ALBs
  res.write(': connected\n\n');

  const sendEvent = (payload: Record<string, unknown>) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  // Wire up client disconnect abortion
  const abortController = new AbortController();
  const onClose = () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  };
  res.on('close', onClose);

  if (signal) {
    if (signal.aborted) {
      abortController.abort();
    } else {
      signal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
  }

  try {
    // 1. Build context ONCE outside the retry loop to avoid re-querying DB on key rotation
    let systemPrompt: string;
    try {
      const orgContextJson = await buildOrgContextSnapshot(organizationId);
      systemPrompt = buildSystemPrompt(orgContextJson, orgRole);
    } catch (err) {
      logger.error({ err, organizationId }, 'Failed to construct organization context snapshot');
      sendEvent({ type: 'error', message: 'Failed to load organizational context.' });
      res.end();
      return;
    }

    // 2. Bound conversation history to last 8 turns to avoid context overflow
    const recentHistory = input.history.slice(-8);
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: input.message },
    ];

    // 3. Candidate models with independent rate-limit quotas on Groq
    const CANDIDATE_MODELS = [
      env.GROQ_MODEL,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

    // 4. True round-robin key balancing across requests
    const startIndex = globalKeyIndex;
    globalKeyIndex = (globalKeyIndex + 1) % GROQ_KEYS.length;

    let lastError: unknown;
    let hasEmittedTokens = false;

    attemptsLoop:
    for (const model of CANDIDATE_MODELS) {
      for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
        if (abortController.signal.aborted) {
          break attemptsLoop;
        }

        const key = GROQ_KEYS[(startIndex + attempt) % GROQ_KEYS.length];
        const groq = new Groq({ apiKey: key });

        try {
          const stream = await groq.chat.completions.create(
            {
              model,
              messages,
              stream: true,
              temperature: 0.3,
              max_tokens: 750, // Safely within Groq 1000 OTPM limit; prompt completes in ~420 tokens
            },
            { signal: abortController.signal },
          );

          for await (const chunk of stream) {
            if (abortController.signal.aborted) {
              break attemptsLoop;
            }
            const token = chunk.choices[0]?.delta?.content;
            if (token) {
              hasEmittedTokens = true;
              sendEvent({ type: 'token', content: token });
            }
          }

          if (!abortController.signal.aborted) {
            sendEvent({ type: 'done' });
          }
          res.end();
          return;

        } catch (err: unknown) {
          lastError = err;

          // Never retry if partial tokens were already emitted to client
          if (hasEmittedTokens) {
            logger.warn({ err }, 'Stream interrupted mid-generation; aborting retry to avoid partial duplicate output');
            break attemptsLoop;
          }

          // Strongly-typed Groq API error checking
          const isRetryable =
            err instanceof APIError &&
            (err.status === 429 || err.status === 401 || err.status === 413);

          if (isRetryable && !abortController.signal.aborted) {
            logger.warn(
              { model, attempt, status: err.status },
              'Groq request failed with retryable status; rotating key/model'
            );
            continue;
          }

          break attemptsLoop;
        }
      }
    }

    if (!abortController.signal.aborted) {
      logger.error({ err: lastError, organizationId }, 'Intelligence chat failed after all key and model attempts');
      const is429 = lastError instanceof APIError && lastError.status === 429;
      sendEvent({
        type: 'error',
        message: is429
          ? 'Intelligence quota is temporarily resetting. Please try again in 30 seconds.'
          : 'Intelligence is temporarily unavailable. Please try again shortly.',
      });
      res.end();
    }
  } finally {
    res.off('close', onClose);
  }
}

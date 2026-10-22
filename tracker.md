# System Refactoring Tracker (`tracker.md`)

This tracker monitors the step-by-step simplification and refactoring of over-engineered or fragile components identified during code review, ensuring zero regression and production stability.

---

## Checkpoints & Milestones

- **Checkpoint 0 (Baseline)** — `2026-09-27`
  - Baseline health verified: 12/12 backend test suites passed (41/41 tests passing), frontend build clean (`tsc -b && vite build`).
  - `tracker.md` and `decision.md` initialized.
  - Scope locked: 9 targeted refactor tasks (`REF-01` to `REF-09`).


## Progress Overview

| ID | Issue / Target | Component / File | Severity | Status | Safety Checks |
|---|---|---|---|---|---|
| **REF-01** | `DynamicPrisma` untyped cast & bracket indexing | `backend/src/modules/bom/bom.service.ts` | High (Type Safety) | ✅ Completed | Backend unit tests (`bom.service.test.ts`) & TSC build |
| **REF-02** | Chained string checks in DB connection retry | `backend/src/config/database.ts` | Medium (Maintainability) | ✅ Completed | Database connection smoke test & test suite |
| **REF-03** | Speculative multi-key rotation pool in Groq client | `backend/src/modules/intelligence/intelligence.service.ts` | Medium (Simplicity) | ✅ Completed | Intelligence service stateless key fallback & TSC |
| **REF-04** | Over-heavy JSON briefing snapshot in context builder | `backend/src/modules/intelligence/intelligence.service.ts` | Low (Performance/Latency) | ✅ Completed | Compact context payload & 750 max_tokens OTPM fix |
| **REF-05** | Redundant mutable accumulator arrays in ABC reports | `backend/src/modules/reports/reports.service.ts` | Low (Code Quality) | 📋 Planned | Reports unit tests (`reports.service.test.ts`) |
| **REF-06** | 535-line hand-rolled regex markdown & badge parser | `frontend/src/components/chat/AiAssistantChatbot.tsx` | High (Fragility/Bloat) | ✅ Completed | Copilot chat UI verification, KPI ribbon, & ERP action cards |
| **REF-07** | 137 lines of pointer capture drag & resize math | `frontend/src/components/chat/AiAssistantChatbot.tsx` | Medium (UX/Bugs) | 📋 Planned | Floating button responsiveness & mobile check |
| **REF-08** | Brittle dual-regex intent classifier & false-positive stock movement | `frontend/src/components/chat/AiAssistantChatbot.tsx` | Medium (Routing Accuracy) | ✅ Completed | Analytical precedence & safe stock action regex guards |
| **REF-09** | Multi-session localStorage partitioning complexity | `frontend/src/components/chat/AiAssistantChatbot.tsx` | Low (Maintainability) | 📋 Planned | Chat history drawer & session persistence check |

---

## Detailed Task Checklist

### Phase 1: Backend Type Safety & Robustness
- [x] **REF-01: Remove `DynamicPrisma` from `bom.service.ts`**
  - *Goal:* Ensure Prisma schema has `BomAssembly`, `BomComponent`, and `BomBuildLog`, regenerate Prisma Client via `npx prisma generate`, and revert bracket access (`assembly['name']`) back to typed dot notation (`assembly.name`).
  - *Validation:* `npm test --prefix backend` (`bom.service.test.ts` passed), `npx tsc --noEmit --project backend/tsconfig.json` passed with 0 errors. Completed on `2026-09-27`.

- [x] **REF-02: Streamline transient error checking in `database.ts`**
  - *Goal:* Replace 9-clause `||` string checks with a clean Set of error codes + single regex pattern.
  - *Validation:* `npx tsc --noEmit` passed with 0 errors; full backend test suite (12/12 suites, 41/41 tests) passed. Completed on `2026-09-27`.

- [x] **REF-03: Implement Round-Robin Key Balancing & Streaming Reliability in `intelligence.service.ts`**
  - *Goal:* Implement true request-level round-robin key rotation (`globalKeyIndex`), memoize context building outside retry loop, guard against mid-stream partial retries, wire `AbortController` to client disconnection, send SSE keep-alive (`: connected\n\n`), dynamically parameterize breakdown table schema to prevent dead-stock bias, and strongly type Groq error handling via `APIError`.
  - *Validation:* `npx tsc --noEmit` passed with 0 errors; full backend test suite (12/12 suites, 41/41 tests) passed. Completed on `2026-09-27`.

- [x] **REF-04: Streamline context payload in `intelligence.service.ts`**
  - *Goal:* Strip unnecessary descriptions and repetitive nesting from `buildOrgContextSnapshot` to reduce token consumption and latency; bound output to 750 tokens to respect Groq free-tier OTPM limits.
  - *Validation:* Live SSE streaming test against Groq API generated full real-time analysis cleanly. Completed on `2026-09-27`.

- [ ] **REF-05: Clean up ABC item grouping in `reports.service.ts`**
  - *Goal:* Consolidate `classAItems`, `classBItems`, `classCItems` declarations into a clean typed accumulator.
  - *Validation:* `npm test --prefix backend` (`reports.service.test.ts`).

---

### Phase 2: Frontend Architecture & UI Stability
- [x] **REF-06: Replace hand-rolled markdown parser with Executive Structured UI & 1-Click ERP Action Dispatch in `AiAssistantChatbot.tsx`**
  - *Goal:* Transform flat markdown streams into structured executive cards with:
    1. Hero KPI Ribbon (top-level diagnostic metrics).
    2. Interactive Tabular Data Grid with SKU deep-linking (`/products?search=SKU`) and catalog navigation toolbar.
    3. 1-Click Action Dispatch Cards with primary copilot command chips (`⚡ Execute: ...`) and direct ERP route buttons (`🚚 Create Clearance Challan`, `🛒 Reorder Hub`, `📈 Reports`).
    4. Strict financial math instructions (holding drag ~18% of locked capital).
  - *Validation:* `npm run build` in frontend passed with 0 errors; 12/12 backend test suites passed (41/41 tests). Completed on `2026-09-27`.

- [ ] **REF-07: Simplify floating trigger button & window positioning in `AiAssistantChatbot.tsx`**
  - *Goal:* Replace 137 lines of imperative pointer-capture listeners, delta calculations, and resize hooks with clean CSS fixed positioning and lightweight boundary constraints.
  - *Validation:* Verify trigger button stays accessible across standard desktop and mobile viewports.

- [x] **REF-08: Streamline prompt intent routing & eliminate false-positive stock movements in `AiAssistantChatbot.tsx` and `copilotEngine.ts`**
  - *Goal:* 
    1. Reorder `classifyPromptIntent` so diagnostic cues (`dead stock`, `dead inventory`, `holding cost`, `margin leak`, etc.) take precedence over generic query verbs (`show`, `list`).
    2. Eliminate over-broad substring checks in `copilotEngine.ts` where `clean.includes('in')` was matching the "in" inside words like "inventory" or prepositions and triggering false-positive `MOVE_STOCK` inward actions.
    3. Add dedicated dead stock and capital lockup intent handler in `copilotEngine.ts` backed by `reportService.getAnalytics('30d')`.
  - *Validation:* `npm run build` in frontend passed with 0 errors; 12/12 backend test suites passed (41/41 tests). Completed on `2026-09-27`.

- [ ] **REF-09: Streamline chat session persistence in `AiAssistantChatbot.tsx`**
  - *Goal:* Simplify multi-session storage handling and eliminate redundant migration/cleanup logic.
  - *Validation:* Verify message sending, history loading, and session reset.

---

## Verification & Rollback Strategy

1. **Incremental Execution:** Address issues one by one. Never mix backend architectural changes with frontend UI rewrites in the same commit/step.
2. **Automated Testing:** Run full unit test suite after each backend refactor.
3. **TypeScript Strict Checks:** Ensure zero TypeScript errors (`tsc --noEmit`) before marking any task complete.
4. **Visual & Interactive Verification:** Manually verify UI interactions (floating button, chat streaming, markdown tables) after each frontend refactor.

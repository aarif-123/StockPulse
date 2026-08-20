// Zod validation schemas for the dashboard module.

import { z } from 'zod';

/**
 * The dashboard stats response shape — no query params needed currently,
 * but the schema file exists for future period/range filtering.
 */
export const dashboardStatsSchema = z.object({});
export type DashboardStatsInput = z.infer<typeof dashboardStatsSchema>;

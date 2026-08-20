/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in Node environment (no browser DOM needed)
    environment: 'node',
    // Auto-import Vitest globals (describe, it, expect, vi) — no import needed
    globals: true,
    // Coverage via V8 (built-in, no instrumentation overhead)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Only measure coverage on source files, not tests or generated code
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      // Fail CI if overall coverage drops below thresholds
      thresholds: {
        lines:     70,
        functions: 70,
        branches:  60,
      },
    },
  },
});

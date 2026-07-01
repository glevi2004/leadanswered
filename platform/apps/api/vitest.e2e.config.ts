import { defineConfig } from "vitest/config";

/**
 * E2E config — runs the `*.e2e.ts` suites that hit the REAL Claude API. Kept separate from the default
 * config (which globs only `*.test.ts`) so a normal `pnpm test` never triggers paid API calls. Long
 * timeouts (real turns are ~1-2s each) and retries (model variance) are expected here.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/e2e/**/*.e2e.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    retry: 2,
    // Real conversations are I/O-bound but rate-limit-sensitive; keep concurrency modest.
    fileParallelism: true,
    maxConcurrency: 4,
  },
});

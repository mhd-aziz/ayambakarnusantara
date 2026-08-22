import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration suite hits a remote Supabase project (ap-southeast-2)
    // from GitHub hosted runners (us-east): cross-region latency per await
    // easily exceeds Vitest's 5s default on the multi-await order tests.
    testTimeout: 30000,
    hookTimeout: 30000,
    globals: true,
  },
});

/**
 * Smoke script: boot the reference server on an ephemeral port, run the full
 * programmatic demo flow, print a one-line summary per step, and exit non-zero
 * on any failure.
 *
 * Run with: `npx tsx tests/smoke.ts` (or `pnpm smoke`).
 */

import { createServer } from "../src/server.js";
import { runDemoFlow } from "../src/demo-flow.js";

async function main(): Promise<void> {
  const server = await createServer({ port: 0 }).listen();
  console.log(`[smoke] reference server listening at ${server.baseUrl}`);

  try {
    const result = await runDemoFlow(server);
    for (const step of result.steps) {
      const mark = step.ok ? "PASS" : "FAIL";
      console.log(`[smoke] ${mark} ${step.name} — ${step.detail}`);
    }
    if (!result.ok) {
      console.error("[smoke] demo flow failed");
      process.exitCode = 1;
      return;
    }
    console.log(`[smoke] all ${result.steps.length} steps passed`);
  } finally {
    await server.close();
  }
}

main().catch((error: unknown) => {
  console.error("[smoke] unexpected error:", error);
  process.exitCode = 1;
});

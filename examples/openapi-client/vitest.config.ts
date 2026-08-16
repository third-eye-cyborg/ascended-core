import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest does not read tsconfig paths; alias every workspace package the
// tests can reach transitively (sdk → api-contracts, minimal-server → its
// ten runtime deps, all of which may import @third-eye-cyborg/ascended-core or contracts).
const pkg = (rel: string) =>
  fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@third-eye-cyborg/ascended-example-minimal-server": pkg("../minimal-server/src/index.ts"),
      "@third-eye-cyborg/ascended-api-contracts": pkg("../../packages/api-contracts/src/index.ts"),
      "@third-eye-cyborg/ascended-sdk": pkg("../../packages/sdk/src/index.ts"),
      "@third-eye-cyborg/ascended-core": pkg("../../packages/core/src/index.ts"),
      "@third-eye-cyborg/ascended-contracts": pkg("../../packages/contracts/src/index.ts"),
      "@third-eye-cyborg/ascended-events": pkg("../../packages/events/src/index.ts"),
      "@third-eye-cyborg/ascended-privacy": pkg("../../packages/privacy/src/index.ts"),
      "@third-eye-cyborg/ascended-ai-router": pkg("../../packages/ai-router/src/index.ts"),
      "@third-eye-cyborg/ascended-providers": pkg("../../packages/providers/src/index.ts"),
      "@third-eye-cyborg/ascended-persistence": pkg("../../packages/persistence/src/index.ts"),
      "@third-eye-cyborg/ascended-realtime": pkg("../../packages/realtime/src/index.ts"),
      "@third-eye-cyborg/ascended-media": pkg("../../packages/media/src/index.ts"),
      "@third-eye-cyborg/ascended-notifications": pkg("../../packages/notifications/src/index.ts"),
      "@third-eye-cyborg/ascended-observability": pkg("../../packages/observability/src/index.ts"),
    },
  },
});

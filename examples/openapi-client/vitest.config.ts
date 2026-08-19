import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest does not read tsconfig paths; alias every workspace package the
// tests can reach transitively (sdk → api-contracts, minimal-server → its
// ten runtime deps, all of which may import @third-eye-cyborg/core or contracts).
const pkg = (rel: string) =>
  fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@third-eye-cyborg/example-minimal-server": pkg("../minimal-server/src/index.ts"),
      "@third-eye-cyborg/api-contracts": pkg("../../packages/api-contracts/src/index.ts"),
      "@third-eye-cyborg/sdk": pkg("../../packages/sdk/src/index.ts"),
      "@third-eye-cyborg/core": pkg("../../packages/core/src/index.ts"),
      "@third-eye-cyborg/contracts": pkg("../../packages/contracts/src/index.ts"),
      "@third-eye-cyborg/events": pkg("../../packages/events/src/index.ts"),
      "@third-eye-cyborg/privacy": pkg("../../packages/privacy/src/index.ts"),
      "@third-eye-cyborg/ai-router": pkg("../../packages/ai-router/src/index.ts"),
      "@third-eye-cyborg/providers": pkg("../../packages/providers/src/index.ts"),
      "@third-eye-cyborg/persistence": pkg("../../packages/persistence/src/index.ts"),
      "@third-eye-cyborg/realtime": pkg("../../packages/realtime/src/index.ts"),
      "@third-eye-cyborg/media": pkg("../../packages/media/src/index.ts"),
      "@third-eye-cyborg/notifications": pkg("../../packages/notifications/src/index.ts"),
      "@third-eye-cyborg/observability": pkg("../../packages/observability/src/index.ts"),
    },
  },
});

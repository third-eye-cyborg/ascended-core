import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest does not read tsconfig paths; alias every workspace package the
// tests can reach transitively (sdk → api-contracts, minimal-server → its
// ten runtime deps, all of which may import @ascended/core or contracts).
const pkg = (rel: string) =>
  fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@ascended/example-minimal-server": pkg("../minimal-server/src/index.ts"),
      "@ascended/api-contracts": pkg("../../packages/api-contracts/src/index.ts"),
      "@ascended/sdk": pkg("../../packages/sdk/src/index.ts"),
      "@ascended/core": pkg("../../packages/core/src/index.ts"),
      "@ascended/contracts": pkg("../../packages/contracts/src/index.ts"),
      "@ascended/events": pkg("../../packages/events/src/index.ts"),
      "@ascended/privacy": pkg("../../packages/privacy/src/index.ts"),
      "@ascended/ai-router": pkg("../../packages/ai-router/src/index.ts"),
      "@ascended/providers": pkg("../../packages/providers/src/index.ts"),
      "@ascended/persistence": pkg("../../packages/persistence/src/index.ts"),
      "@ascended/realtime": pkg("../../packages/realtime/src/index.ts"),
      "@ascended/media": pkg("../../packages/media/src/index.ts"),
      "@ascended/notifications": pkg("../../packages/notifications/src/index.ts"),
      "@ascended/observability": pkg("../../packages/observability/src/index.ts"),
    },
  },
});

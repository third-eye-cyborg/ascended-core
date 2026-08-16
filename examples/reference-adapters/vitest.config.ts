import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@third-eye-cyborg/ascended-core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-events": fileURLToPath(new URL("../../packages/events/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-providers": fileURLToPath(new URL("../../packages/providers/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-persistence": fileURLToPath(new URL("../../packages/persistence/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-realtime": fileURLToPath(new URL("../../packages/realtime/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-media": fileURLToPath(new URL("../../packages/media/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-notifications": fileURLToPath(new URL("../../packages/notifications/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-observability": fileURLToPath(new URL("../../packages/observability/src/index.ts", import.meta.url)),
    },
  },
});

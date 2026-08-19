import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@third-eye-cyborg/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/events": fileURLToPath(new URL("../../packages/events/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/providers": fileURLToPath(new URL("../../packages/providers/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/persistence": fileURLToPath(new URL("../../packages/persistence/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/realtime": fileURLToPath(new URL("../../packages/realtime/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/media": fileURLToPath(new URL("../../packages/media/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/notifications": fileURLToPath(new URL("../../packages/notifications/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/observability": fileURLToPath(new URL("../../packages/observability/src/index.ts", import.meta.url)),
    },
  },
});

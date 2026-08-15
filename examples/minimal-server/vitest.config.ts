import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@ascended/contracts": fileURLToPath(new URL("../../packages/contracts/src/index.ts", import.meta.url)),
      "@ascended/events": fileURLToPath(new URL("../../packages/events/src/index.ts", import.meta.url)),
      "@ascended/privacy": fileURLToPath(new URL("../../packages/privacy/src/index.ts", import.meta.url)),
      "@ascended/ai-router": fileURLToPath(new URL("../../packages/ai-router/src/index.ts", import.meta.url)),
      "@ascended/providers": fileURLToPath(new URL("../../packages/providers/src/index.ts", import.meta.url)),
      "@ascended/persistence": fileURLToPath(new URL("../../packages/persistence/src/index.ts", import.meta.url)),
      "@ascended/realtime": fileURLToPath(new URL("../../packages/realtime/src/index.ts", import.meta.url)),
      "@ascended/media": fileURLToPath(new URL("../../packages/media/src/index.ts", import.meta.url)),
      "@ascended/notifications": fileURLToPath(new URL("../../packages/notifications/src/index.ts", import.meta.url)),
      "@ascended/observability": fileURLToPath(new URL("../../packages/observability/src/index.ts", import.meta.url)),
    },
  },
});

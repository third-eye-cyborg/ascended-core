import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@third-eye-cyborg/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/events": fileURLToPath(new URL("../events/src/index.ts", import.meta.url)),
    },
  },
});

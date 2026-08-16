import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@third-eye-cyborg/ascended-core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@third-eye-cyborg/ascended-privacy": fileURLToPath(new URL("../privacy/src/index.ts", import.meta.url)),
    },
  },
});

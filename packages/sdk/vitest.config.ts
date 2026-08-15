import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@ascended/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@ascended/api-contracts": fileURLToPath(new URL("../api-contracts/src/index.ts", import.meta.url)),
    },
  },
});

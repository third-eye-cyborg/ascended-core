import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@ascended/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@ascended/events": fileURLToPath(new URL("../events/src/index.ts", import.meta.url)),
    },
  },
});

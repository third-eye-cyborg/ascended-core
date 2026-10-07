import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  // Keep workspace packages and runtime deps as imports; the previous
  // `@third-eye-cyborg/ascended-*` regex matched nothing after the rename.
  external: [/^@third-eye-cyborg\//, "react", "react-dom", "zod", "yaml"],
});

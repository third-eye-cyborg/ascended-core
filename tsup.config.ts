import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // tsup's DTS step injects `baseUrl`, which TypeScript 6 reports as deprecated
  // (TS5101). Silence it for the DTS build only; `tsc --noEmit` stays strict.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  // Keep workspace packages and runtime deps as imports; the previous
  // `@third-eye-cyborg/ascended-*` regex matched nothing after the rename.
  external: [/^@third-eye-cyborg\//, "react", "react-dom", "zod", "yaml"],
});

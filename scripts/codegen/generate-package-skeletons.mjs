#!/usr/bin/env node
/**
 * Dev-only scaffolding helper: generates uniform package.json / tsconfig.json /
 * vitest.config.ts / tsup.config.ts skeletons for every workspace package so all
 * packages share identical build, test, and typecheck conventions.
 *
 * Usage: node scripts/codegen/generate-package-skeletons.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** name → { dir, desc, deps (workspace), external (npm runtime), private } */
const PACKAGES = {
  contracts: {
    desc: "Platform-neutral domain contracts: identity, content, community, conversation, events, avatars, search, and audit shapes.",
    deps: ["core"],
  },
  events: {
    desc: "Typed, versioned domain events with an event-bus contract, idempotency, retry/dead-letter interfaces, and a deterministic in-memory test harness.",
    deps: ["core"],
    external: ["zod"],
  },
  privacy: {
    desc: "Privacy modes (cloud / private-local / human-only), policy enforcement hooks, data minimization, and redaction-safe telemetry helpers.",
    deps: ["core"],
  },
  "ai-router": {
    desc: "Provider registry, capability routing, privacy-aware fallbacks, and routing telemetry for AI text/image/3D/recommendation workloads.",
    deps: ["core", "privacy"],
  },
  providers: {
    desc: "Provider ports (auth, storage, email, push, payments, search, rate limiting, audit) plus generic in-memory adapters for tests and examples.",
    deps: ["core"],
  },
  persistence: {
    desc: "Repository, unit-of-work, and transaction interfaces with in-memory implementations. No production schema.",
    deps: ["core"],
  },
  realtime: {
    desc: "Room lifecycle, presence, pub/sub, and call/session abstractions with a local in-memory implementation.",
    deps: ["core", "events"],
  },
  media: {
    desc: "Upload sessions, asset lifecycle, and transformation request contracts with a local filesystem-free in-memory adapter.",
    deps: ["core", "events"],
  },
  notifications: {
    desc: "Notification preferences, delivery attempts, and multi-channel (in-app/email/push) workflow contracts with local adapters.",
    deps: ["core", "events"],
  },
  observability: {
    desc: "Structured logging, tracing spans, metrics, health aggregation, and request-id context with in-memory collectors.",
    deps: ["core"],
  },
  "api-contracts": {
    desc: "Public-safe OpenAPI contract for the reference API plus generated Zod validation types and a drift check.",
    deps: ["core"],
    external: ["zod"],
  },
  sdk: {
    desc: "Hand-curated TypeScript client SDK for the Ascended Core reference API.",
    deps: ["core", "api-contracts"],
    external: ["zod"],
  },
};

const EXAMPLES = {
  "minimal-server": {
    desc: "Runnable reference server demonstrating profiles, posts, communities, events, and notifications on local adapters.",
    deps: Object.keys(PACKAGES).filter((k) => !["api-contracts", "sdk"].includes(k)),
  },
  "reference-adapters": {
    desc: "Synthetic local adapter implementations wired end-to-end for demos and integration tests.",
    deps: ["core", "contracts", "events", "providers", "persistence", "realtime", "media", "notifications", "observability"],
  },
  "openapi-client": {
    desc: "Example client consuming the generated SDK against the minimal server.",
    deps: ["core", "sdk"],
  },
};

const scripts = {
  build: "tsup",
  typecheck: "tsc --noEmit -p tsconfig.json",
  test: "vitest run",
  lint: "eslint src tests",
  format: "prettier --write src tests",
  clean: "rm -rf dist coverage",
};

function pkgJson(name, cfg, isExample) {
  const dir = isExample ? "examples" : "packages";
  const pkg = {
    name: isExample ? `@third-eye-cyborg/example-${name}` : `@third-eye-cyborg/${name}`,
    version: "0.1.0",
    description: cfg.desc,
    type: "module",
    scripts: isExample
      ? {
          typecheck: "tsc --noEmit -p tsconfig.json",
          test: "vitest run",
          lint: "eslint src tests",
          format: "prettier --write src tests",
          clean: "rm -rf dist coverage",
          ...(name === "minimal-server"
            ? { start: "tsx src/server.ts", smoke: "tsx tests/smoke.ts" }
            : {}),
        }
      : scripts,
    dependencies: Object.fromEntries([
      ...cfg.deps.map((d) => [
        isExample ? (Object.keys(EXAMPLES).includes(d) ? `@third-eye-cyborg/example-${d}` : `@third-eye-cyborg/${d}`) : `@third-eye-cyborg/${d}`,
        "workspace:*",
      ]),
      ...(cfg.external ?? []).map((e) => [e, "catalog:"]),
    ]),
    devDependencies: {
      typescript: "catalog:",
      vitest: "catalog:",
      ...(isExample ? { tsx: "catalog:" } : { tsup: "catalog:" }),
    },
  };
  if (!isExample) {
    Object.assign(pkg, {
      main: "./dist/index.cjs",
      module: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js", require: "./dist/index.cjs" },
      },
      files: ["dist"],
      publishConfig: { access: "public" },
    });
  } else {
    pkg.private = true;
  }
  return [join(root, dir, name, "package.json"), JSON.stringify(pkg, null, 2) + "\n"];
}

function tsconfig(name, cfg, isExample) {
  const dir = isExample ? "examples" : "packages";
  const paths = Object.fromEntries(
    cfg.deps.map((d) => {
      const pkgName = Object.keys(EXAMPLES).includes(d) ? `@third-eye-cyborg/example-${d}` : `@third-eye-cyborg/${d}`;
      const pkgDir = Object.keys(PACKAGES).includes(d) ? join("..", d) : join("..", "..", "packages", d);
      return [pkgName, [join(pkgDir, "src", "index.ts")]];
    }),
  );
  const conf = {
    extends: join("..", "..", "tsconfig.base.json"),
    compilerOptions: {
      noEmit: true,
      rootDir: ".",
      types: ["node"],
      ...(Object.keys(paths).length ? { baseUrl: ".", paths } : {}),
    },
    include: ["src", "tests"],
  };
  return [join(root, dir, name, "tsconfig.json"), JSON.stringify(conf, null, 2) + "\n"];
}

function vitestConfig(name, cfg, isExample) {
  const dir = isExample ? "examples" : "packages";
  const aliases = cfg.deps
    .map((d) => {
      const pkgName = Object.keys(EXAMPLES).includes(d) ? `@third-eye-cyborg/example-${d}` : `@third-eye-cyborg/${d}`;
      const pkgDir = Object.keys(PACKAGES).includes(d) ? join("..", d) : join("..", "..", "packages", d);
      return `      ${JSON.stringify(pkgName)}: fileURLToPath(new URL(${JSON.stringify(join(pkgDir, "src", "index.ts"))}, import.meta.url)),`;
    })
    .join("\n");
  const content = `import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
${
  aliases
    ? `  resolve: {
    alias: {
${aliases}
    },
  },
`
    : ""
}});
`;
  return [join(root, dir, name, "vitest.config.ts"), content];
}

const writes = [];
for (const [name, cfg] of Object.entries(PACKAGES)) {
  writes.push(pkgJson(name, cfg, false), tsconfig(name, cfg, false), vitestConfig(name, cfg, false));
  writes.push([
    join(root, "packages", name, "tsup.config.ts"),
    'export { default } from "../../tsup.config";\n',
  ]);
}
for (const [name, cfg] of Object.entries(EXAMPLES)) {
  writes.push(pkgJson(name, cfg, true), tsconfig(name, cfg, true), vitestConfig(name, cfg, true));
}

for (const [path, content] of writes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
console.log(`Wrote ${writes.length} skeleton files.`);

/**
 * Package smoke check: verifies that every publishable package's built
 * CommonJS and ESM entry points actually load (catches CJS-breaking syntax
 * such as un-shimmed import.meta in dist output) and that `npm pack` tarballs
 * include release metadata and required legal notices.
 *
 * Run AFTER `pnpm -r build`. Usage: node scripts/checks/package-smoke.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { listPublishableWorkspaces } from "./workspace-packages.mjs";

const root = new URL("../../", import.meta.url).pathname;

let failures = 0;

for (const workspace of listPublishableWorkspaces(root)) {
  const pkgDir = workspace.path;
  const pkg = workspace.pkg;

  const cjs = join(pkgDir, "dist", "index.cjs");
  const esm = join(pkgDir, "dist", "index.js");

  for (const [label, file] of [["CJS", cjs], ["ESM", esm]]) {
    try {
      if (label === "CJS") {
        execFileSync(
          process.execPath,
          ["--input-type=commonjs", "-e", `require(${JSON.stringify(cjs)})`],
          { stdio: "pipe" },
        );
      } else {
        execFileSync(
          process.execPath,
          [
            "-e",
            `import(${JSON.stringify(pathToFileURL(file).href)}).then(()=>{},(e)=>{console.error(e);process.exit(1)})`,
          ],
          { stdio: "pipe" },
        );
      }
      console.log(`ok   ${pkg.name} ${label} loads`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${pkg.name} ${label} failed to load: ${error.message}`);
    }
  }

  // Guard: third-party code inlined into dist must be attributed. Any
  // node_modules/ source in a dist source map must name a package that is
  // listed in this package's THIRD_PARTY_NOTICES.md.
  const distDir = join(pkgDir, "dist");
  const noticesPath = join(pkgDir, "THIRD_PARTY_NOTICES.md");
  const notices = existsSync(noticesPath) ? readFileSync(noticesPath, "utf8") : "";
  const bundled = new Set();
  if (existsSync(distDir)) {
    for (const mapFile of readdirSync(distDir).filter((f) => f.endsWith(".map"))) {
      const map = JSON.parse(readFileSync(join(distDir, mapFile), "utf8"));
      for (const source of map.sources ?? []) {
        if (!source.includes("node_modules/")) continue;
        const parts = source.split("node_modules/").pop().split("/");
        bundled.add(parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0]);
      }
    }
  }
  const unattributed = [...bundled].filter((name) => !notices.includes(name));
  if (unattributed.length > 0) {
    failures += 1;
    console.error(
      `FAIL ${pkg.name} dist bundles third-party code not listed in THIRD_PARTY_NOTICES.md: ${unattributed.join(", ")}`,
    );
  } else {
    console.log(`ok   ${pkg.name} dist bundles no unattributed third-party code`);
  }

  try {
    const out = execFileSync(
      "npm",
      ["pack", "--dry-run", "--json"],
      { cwd: pkgDir, stdio: ["pipe", "pipe", "pipe"] },
    ).toString();
    const parsed = JSON.parse(out);
    const files = parsed[0]?.files?.map((f) => f.path) ?? [];
    if (!files.some((f) => /(^|\/)LICENSE$/i.test(f))) {
      failures += 1;
      console.error(`FAIL ${pkg.name} tarball is missing LICENSE`);
    } else {
      console.log(`ok   ${pkg.name} tarball includes LICENSE`);
    }
    if (!files.includes("NOTICE")) {
      failures += 1;
      console.error(`FAIL ${pkg.name} tarball is missing NOTICE`);
    } else if (readFileSync(join(pkgDir, "NOTICE"), "utf8") !== readFileSync(join(root, "NOTICE"), "utf8")) {
      failures += 1;
      console.error(`FAIL ${pkg.name} NOTICE differs from the root NOTICE`);
    } else {
      console.log(`ok   ${pkg.name} tarball includes NOTICE`);
    }
    if (pkg.author !== "Third Eye Cyborg, LLC" || !pkg.repository?.url || !pkg.homepage || !pkg.bugs?.url) {
      failures += 1;
      console.error(`FAIL ${pkg.name} tarball manifest is missing provenance metadata`);
    }
    const hasExternalRuntimeDependency = Object.keys(pkg.dependencies ?? {}).some((name) => !name.startsWith("@third-eye-cyborg/"));
    if (hasExternalRuntimeDependency && !files.includes("THIRD_PARTY_NOTICES.md")) {
      failures += 1;
      console.error(`FAIL ${pkg.name} tarball is missing THIRD_PARTY_NOTICES.md`);
    }
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${pkg.name} npm pack dry-run failed: ${error.message}`);
  }
}

if (failures > 0) {
  console.error(`\npackage smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\npackage smoke: all packages load and pack cleanly");

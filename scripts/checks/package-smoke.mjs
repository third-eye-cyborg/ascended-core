/**
 * Package smoke check: verifies that every publishable package's built
 * CommonJS and ESM entry points actually load (catches CJS-breaking syntax
 * such as un-shimmed import.meta in dist output) and that `npm pack` tarballs
 * include release metadata and required legal notices.
 *
 * Run AFTER `pnpm -r build`. Usage: node scripts/checks/package-smoke.mjs
 */

import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { listPublishableWorkspaces } from "./workspace-packages.mjs";

const root = new URL("../../", import.meta.url).pathname;

let failures = 0;

// Same workspace set `pnpm -r publish` considers: every non-private
// workspace, wherever it lives.
for (const { path: pkgDir, pkg } of listPublishableWorkspaces(root)) {

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
    if (pkg.author !== "Third Eye Cyborg LLC" || !pkg.repository?.url || !pkg.homepage || !pkg.bugs?.url) {
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

/**
 * Package smoke check: verifies that every publishable package's built
 * CommonJS and ESM entry points actually load (catches CJS-breaking syntax
 * such as un-shimmed import.meta in dist output) and that `npm pack` tarballs
 * include release metadata and required legal notices.
 *
 * After the per-package checks, every tarball is installed into a fresh
 * temporary project and imported as ESM and required as CJS, and the
 * published `.d.ts` files are confirmed to exist.
 *
 * Run AFTER `pnpm -r build`. Usage: node scripts/checks/package-smoke.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { listPublishableWorkspaces } from "./workspace-packages.mjs";

const root = new URL("../../", import.meta.url).pathname;

let failures = 0;
const packedTarballs = [];

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
    // Use pnpm pack so workspace:* dependencies are rewritten to published
    // versions, matching `pnpm publish`. Plain `npm pack` leaves workspace:*.
    const packed = execFileSync("pnpm", ["pack", "--json"], {
      cwd: pkgDir,
      stdio: ["pipe", "pipe", "pipe"],
    }).toString();
    const packInfo = JSON.parse(packed);
    const info = Array.isArray(packInfo) ? packInfo[0] : packInfo;
    const files = info?.files?.map((f) => f.path) ?? [];
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
    if (!info?.filename) {
      failures += 1;
      console.error(`FAIL ${pkg.name} pnpm pack did not report a filename`);
    } else {
      packedTarballs.push({ name: pkg.name, path: join(pkgDir, info.filename) });
      console.log(`ok   ${pkg.name} packed ${info.filename}`);
    }
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${pkg.name} pnpm pack failed: ${error.message}`);
  }
}

if (packedTarballs.length > 0) {
  const consumerDir = mkdtempSync(join(tmpdir(), "ascended-core-pack-smoke-"));
  try {
    writeFileSync(
      join(consumerDir, "package.json"),
      JSON.stringify(
        {
          name: "ascended-core-pack-smoke-consumer",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );
    execFileSync("npm", ["install", "--ignore-scripts", ...packedTarballs.map((entry) => entry.path)], {
      cwd: consumerDir,
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(`ok   installed ${packedTarballs.length} tarball(s) into a fresh project`);

    for (const { name } of packedTarballs) {
      try {
        execFileSync(
          process.execPath,
          ["--input-type=module", "-e", `await import(${JSON.stringify(name)})`],
          { cwd: consumerDir, stdio: "pipe" },
        );
        console.log(`ok   ${name} ESM import from installed tarball`);
      } catch (error) {
        failures += 1;
        console.error(`FAIL ${name} ESM import from installed tarball: ${error.message}`);
      }

      try {
        execFileSync(
          process.execPath,
          [
            "--input-type=commonjs",
            "-e",
            `require(${JSON.stringify(name)})`,
          ],
          { cwd: consumerDir, stdio: "pipe" },
        );
        console.log(`ok   ${name} CJS require from installed tarball`);
      } catch (error) {
        failures += 1;
        console.error(`FAIL ${name} CJS require from installed tarball: ${error.message}`);
      }

      const typesPath = join(consumerDir, "node_modules", name, "dist", "index.d.ts");
      if (!existsSync(typesPath)) {
        failures += 1;
        console.error(`FAIL ${name} installed tarball is missing dist/index.d.ts`);
      } else {
        console.log(`ok   ${name} ships type definitions`);
      }
    }
  } catch (error) {
    failures += 1;
    const details = error.stderr ? error.stderr.toString() : error.message;
    console.error(`FAIL tarball install into fresh project failed: ${details}`);
  } finally {
    rmSync(consumerDir, { recursive: true, force: true });
    for (const { path } of packedTarballs) {
      rmSync(path, { force: true });
    }
  }
}

if (failures > 0) {
  console.error(`\npackage smoke: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\npackage smoke: all packages load, pack, and install cleanly");

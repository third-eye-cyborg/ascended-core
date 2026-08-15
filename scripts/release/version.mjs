#!/usr/bin/env node
/**
 * Bump a package's version consistently.
 *
 * Usage:
 *   node scripts/release/version.mjs <package-dir> <semver>
 *
 * Example:
 *   node scripts/release/version.mjs packages/core 0.1.1
 *
 * Zero dependencies (Node built-ins only). Reads the package.json in the given
 * directory, validates the semver, updates the "version" field in place, and
 * preserves the file's existing indentation and trailing newline.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const [, , packageDir, version] = process.argv;

if (!packageDir || !version) {
  fail("usage: node scripts/release/version.mjs <package-dir> <semver>");
}

if (!SEMVER.test(version)) {
  fail(`"${version}" is not a valid semantic version`);
}

const pkgPath = resolve(join(packageDir, "package.json"));
if (!existsSync(pkgPath)) {
  fail(`no package.json found at ${pkgPath}`);
}

const raw = readFileSync(pkgPath, "utf8");

// Preserve indentation (default two spaces) and trailing newline.
const indentMatch = raw.match(/^([ \t]+)"/m);
const indent = indentMatch ? indentMatch[1] : "  ";
const hadTrailingNewline = raw.endsWith("\n");

let pkg;
try {
  pkg = JSON.parse(raw);
} catch (e) {
  fail(`could not parse ${pkgPath}: ${e instanceof Error ? e.message : e}`);
}

const previous = pkg.version;
pkg.version = version;

let out = JSON.stringify(pkg, null, indent);
if (hadTrailingNewline) out += "\n";
writeFileSync(pkgPath, out);

console.log(`${pkg.name ?? packageDir}: ${previous ?? "(none)"} -> ${version}`);

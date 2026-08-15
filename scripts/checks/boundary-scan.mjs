#!/usr/bin/env node
/**
 * Boundary scan for Ascended Core.
 *
 * Ascended Core is vendor-neutral open-source infrastructure. This script
 * recursively scans text files in the repository for forbidden terms — real
 * vendor names, product URLs, and secret-like markers — and fails (exit 1) if
 * any are found.
 *
 * Zero dependencies (Node built-ins only). Run:
 *
 *   node scripts/checks/boundary-scan.mjs
 *
 * Allow-list: append an inline `boundary-ok` comment on the same line to permit
 * an otherwise-forbidden term (use sparingly and only when justified).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve, sep } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Repo root is two levels up from scripts/checks/.
const ROOT = resolve(__dirname, "..", "..");

/** Forbidden terms (matched case-insensitively as literal substrings). */
const FORBIDDEN_TERMS = [
  "clerk",
  "cloudflare",
  "polar.sh",
  "revenuecat",
  "onesignal",
  "sentry",
  "posthog",
  "meshy",
  "openai",
  "replit",
  "ascended.social",
  "sk_live",
  "sk_live_",
  "api_key=",
  "BEGIN PRIVATE KEY",
  "BEGIN OPENSSH",
];

/** Directory names to skip entirely, anywhere in the tree. */
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "coverage"]);

/** Specific files (relative to repo root) to skip. */
const SKIP_FILES = new Set(
  [
    "pnpm-lock.yaml",
    // This script itself references the forbidden terms by definition.
    join("scripts", "checks", "boundary-scan.mjs"),
    // The funding doc documents the funding platform in full, by design.
    join("docs", "migration-and-adoption", "funding.md"),
  ].map((p) => p.split("/").join(sep)),
);

/** File extensions / names we treat as binary and never scan. */
const BINARY_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "pdf",
  "zip",
  "gz",
  "tgz",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp4",
  "mov",
  "webm",
  "wasm",
]);

/** @returns {string[]} absolute file paths to scan. */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walk(abs));
    } else if (entry.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

function extensionOf(name) {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

function isLikelyBinary(buffer) {
  const len = Math.min(buffer.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

const files = walk(ROOT);
/** @type {{ file: string; line: number; term: string; text: string }[]} */
const matches = [];

for (const abs of files) {
  const rel = relative(ROOT, abs);
  if (SKIP_FILES.has(rel)) continue;
  if (BINARY_EXT.has(extensionOf(abs))) continue;

  let stats;
  try {
    stats = statSync(abs);
  } catch {
    continue;
  }
  if (!stats.isFile()) continue;

  const buffer = readFileSync(abs);
  if (isLikelyBinary(buffer)) continue;

  const content = buffer.toString("utf8");
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    // Inline allow-list escape hatch.
    if (line.toLowerCase().includes("boundary-ok")) continue;
    const lower = line.toLowerCase();
    for (const term of FORBIDDEN_TERMS) {
      if (lower.includes(term.toLowerCase())) {
        matches.push({
          file: rel,
          line: i + 1,
          term,
          text: line.trim(),
        });
      }
    }
  }
}

if (matches.length > 0) {
  console.error("Boundary scan FAILED — forbidden terms found:\n");
  for (const m of matches) {
    console.error(`  ${m.file}:${m.line}  [${m.term}]  ${m.text}`);
  }
  console.error(
    `\n${matches.length} match(es). Remove the forbidden term(s), or add an ` +
      `inline "boundary-ok" comment on the line if the match is a false ` +
      `positive that is genuinely safe.`,
  );
  process.exit(1);
}

console.log(
  `Boundary scan passed: scanned ${files.length} file(s), no forbidden terms.`,
);

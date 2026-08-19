#!/usr/bin/env node
/**
 * Third-party compliance tool for Ascended Core.
 *
 * Modes:
 *   --sbom          Generate an SPDX 2.3 JSON SBOM of all workspace packages
 *                   and their direct runtime dependencies, written to stdout.
 *   --trace <spec>  Print every dependency path from workspace packages to
 *                   <spec> (e.g. "zod@3.25.76" or just "zod").  Add --json to
 *                   get machine-readable output.
 *   --dry-run       Run all supply-chain checks but exit 0 even on violations
 *                   (report only).
 *   --skip-network  Skip the npm registry integrity cross-reference (check 4).
 *   (default)       Run the full supply-chain compliance check (see below).
 *
 * Supply-chain checks (default mode):
 *   1. Policy check      — every external production dep must be listed in
 *                          compliance/license-policy.json.
 *   2. Registry config   — project .npmrc must not redirect to a non-npm host.
 *   3. Lockfile type     — resolution must come from registry.npmjs.org, not a
 *                          git source, local directory, or foreign tarball URL.
 *   4. Integrity check   — SHA-512 in pnpm-lock.yaml must match npm's published
 *                          dist.integrity (requires outbound HTTPS).
 *   5. Repository URL    — installed package.json repository field must match
 *                          the expected value in the policy.
 *
 * Zero dependencies (Node built-ins only).
 *
 * Usage:
 *   node scripts/checks/third-party-compliance.mjs               # full check
 *   node scripts/checks/third-party-compliance.mjs --sbom        # SBOM → stdout
 *   node scripts/checks/third-party-compliance.mjs --dry-run     # report, no exit-1
 *   node scripts/checks/third-party-compliance.mjs --skip-network
 *   node scripts/checks/third-party-compliance.mjs --trace zod@3.25.76
 *   node scripts/checks/third-party-compliance.mjs --trace zod@3.25.76 --json
 *
 * Exits 0 if all checks pass, 1 on any violation (unless --dry-run).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { get } from "node:https";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// ─── constants ────────────────────────────────────────────────────────────────

/** Canonical npm registry that all approved production deps must originate from. */
export const NPM_REGISTRY = "https://registry.npmjs.org/";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Repo root is two levels up from scripts/checks/.
const ROOT = resolve(__dirname, "..", "..");

// ─── supply-chain pure utilities (exported for tests) ────────────────────────

/**
 * Parse a project-level .npmrc file into a lowercase-key → value map.
 * Lines starting with `#` or `;` are comments and are ignored.
 * @param {string} path  Absolute path to the .npmrc file.
 * @returns {Map<string, string>}
 */
export function parseNpmrc(path) {
  /** @type {Map<string, string>} */
  const result = new Map();
  if (!existsSync(path)) return result;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim().toLowerCase();
    const value = line.slice(eqIdx + 1).trim();
    result.set(key, value);
  }
  return result;
}

/**
 * Return the effective registry URL for a given package name, given parsed
 * project .npmrc entries and a snapshot of environment variables.
 *
 * Precedence (highest first):
 *   1. NPM_CONFIG_REGISTRY or npm_config_registry env var
 *   2. Per-scope registry in .npmrc  (for @scope/name → @scope:registry)
 *   3. Global registry in .npmrc
 *   4. Default: https://registry.npmjs.org/
 *
 * @param {string} depName  Package name (possibly scoped, e.g. "@scope/pkg")
 * @param {Map<string, string>} npmrc  Parsed .npmrc key→value map
 * @param {Record<string, string | undefined>} [env]  Environment variables (defaults to process.env)
 * @returns {string}
 */
export function effectiveRegistry(depName, npmrc, env = process.env) {
  const envReg =
    env["NPM_CONFIG_REGISTRY"] ?? env["npm_config_registry"] ?? "";
  if (envReg) return envReg;

  if (depName.startsWith("@")) {
    const scope = depName.split("/")[0] ?? "";
    const scopeKey = `${scope}:registry`;
    const scopeReg = npmrc.get(scopeKey);
    if (scopeReg) return scopeReg;
  }

  const globalReg = npmrc.get("registry");
  if (globalReg) return globalReg;

  return NPM_REGISTRY;
}

/**
 * Normalise a repository URL for exact comparison:
 * strip `git+` prefix, `.git` suffix, strip the protocol, and lowercase.
 * @param {string} url
 * @returns {string}
 */
export function normaliseRepoUrl(url) {
  return url
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/^(https?|git):\/\//, "")
    .toLowerCase()
    .trim();
}

/**
 * Parse the `packages:` section of a pnpm v9 lockfile and return a map of
 * `packageName@version` → resolution property bag.
 *
 * @param {string} text  Full lockfile text.
 * @returns {Map<string, Record<string, string>>}
 */
export function parseLockfilePackages(text) {
  /** @type {Map<string, Record<string, string>>} */
  const result = new Map();
  const lines = text.split("\n");
  let inPackages = false;
  let currentPkg = /** @type {string | null} */ (null);

  for (const line of lines) {
    if (/^\w[^:]*:/.test(line)) {
      inPackages = line.startsWith("packages:");
      currentPkg = null;
      continue;
    }
    if (!inPackages) continue;

    const pkgMatch =
      line.match(/^  '(.+)':\s*(?:\{\})?$/) ||
      line.match(/^  ([^\s'"{}[\]]+@[^\s'"{}[\]]+):\s*(?:\{\})?$/);
    if (pkgMatch) {
      currentPkg = pkgMatch[1];
      // Inline empty-map `{}` form: register immediately with empty props and
      // clear currentPkg so no resolution block is expected for this entry.
      if (/:\s*\{\}\s*$/.test(line)) {
        result.set(currentPkg, {});
        currentPkg = null;
      }
      continue;
    }

    if (currentPkg && /^    resolution:/.test(line)) {
      const inner = line.match(/resolution:\s*\{([^}]*)\}/);
      if (inner) {
        /** @type {Record<string, string>} */
        const props = {};
        for (const pair of inner[1].split(",")) {
          const kv = pair.trim().match(/^(\w+):\s*(.+)$/);
          if (kv) props[kv[1]] = kv[2].trim();
        }
        result.set(currentPkg, props);
      }
    }
  }

  return result;
}

/**
 * Parse the `snapshots:` section of a pnpm v9 lockfile and return a map of
 * snapshot key → array of direct-dependency resolved keys.
 *
 * Each snapshot key is in the form `name@version` or `name@version(peers…)`.
 * Each returned dep entry has the resolved key `depName@depVersion(peers…)`.
 *
 * @param {string} text  Full lockfile text.
 * @returns {Map<string, Array<{ name: string; resolvedKey: string }>>}
 */
export function parseLockfileSnapshots(text) {
  /** @type {Map<string, Array<{ name: string; resolvedKey: string }>>} */
  const result = new Map();
  const lines = text.split("\n");
  let inSnapshots = false;
  let currentPkg = /** @type {string | null} */ (null);
  let inDependencies = false;

  for (const line of lines) {
    // Top-level section header (no leading space, ends with colon).
    if (/^\w[^:]*:/.test(line)) {
      inSnapshots = line.startsWith("snapshots:");
      currentPkg = null;
      inDependencies = false;
      continue;
    }
    if (!inSnapshots) continue;

    // Snapshot entry at 2-space indent (same format as packages: section).
    // Matches both "  name@version:" and "  name@version: {}" (inline empty map).
    const pkgMatch =
      line.match(/^  '(.+)':\s*(?:\{\})?$/) ||
      line.match(/^  ([^\s'"{}[\]]+@[^\s'"{}[\]]+):\s*(?:\{\})?$/);
    if (pkgMatch) {
      currentPkg = pkgMatch[1];
      inDependencies = false;
      if (!result.has(currentPkg)) result.set(currentPkg, []);
      continue;
    }

    if (!currentPkg) continue;

    // Sub-section at 4-space indent.
    if (/^    dependencies:/.test(line)) {
      inDependencies = true;
      continue;
    }
    // optionalDependencies have the same key: value format as dependencies and
    // represent real (platform-conditional) edges that must be traversable.
    if (/^    optionalDependencies:/.test(line)) {
      inDependencies = true;
      continue;
    }
    // Any other 4-space-indent key ends the dependencies block.
    if (/^    \w/.test(line)) {
      inDependencies = false;
      continue;
    }

    // Dependency entries at 6-space indent:  "      'name': version"  or  "      name: version"
    if (inDependencies && /^      /.test(line)) {
      const depMatch = line.match(
        /^      '?(@?[^':\s]+(?:\/[^':\s]+)?)'?:\s+(.+)$/,
      );
      if (depMatch) {
        const depName = depMatch[1];
        const depVersion = depMatch[2].trim();
        const deps = result.get(currentPkg);
        if (deps)
          deps.push({ name: depName, resolvedKey: `${depName}@${depVersion}` });
      }
    }
  }

  return result;
}

/**
 * Parse the `importers:` section of a pnpm v9 lockfile and return a map of
 * importer path → Map of dep name → snapshot key.
 *
 * Both `dependencies` and `devDependencies` blocks are included.
 * Workspace links (`version: link:…`) are skipped.
 *
 * @param {string} text  Full lockfile text.
 * @returns {Map<string, Map<string, string>>}  importerPath → depName → snapshotKey
 */
export function parseLockfileImporterDeps(text) {
  /** @type {Map<string, Map<string, string>>} */
  const result = new Map();
  const lines = text.split("\n");
  let inImporters = false;
  let currentImporter = /** @type {string | null} */ (null);
  /** @type {"dependencies" | "devDependencies" | null} */
  let currentSection = null;
  let currentDep = /** @type {string | null} */ (null);

  for (const line of lines) {
    // Top-level section header.
    if (/^\w[^:]*:/.test(line)) {
      inImporters = line.startsWith("importers:");
      currentImporter = null;
      currentSection = null;
      currentDep = null;
      continue;
    }
    if (!inImporters) continue;

    // Importer path at 2-space indent (e.g. "  packages/events:").
    if (/^  [^\s].*:$/.test(line)) {
      currentImporter = line.trim().slice(0, -1).replace(/^'|'$/g, "");
      currentSection = null;
      currentDep = null;
      if (!result.has(currentImporter)) result.set(currentImporter, new Map());
      continue;
    }

    if (!currentImporter) continue;

    // Dep-type block at 4-space indent.
    if (/^    dependencies:$/.test(line)) {
      currentSection = "dependencies";
      currentDep = null;
      continue;
    }
    if (/^    devDependencies:$/.test(line)) {
      currentSection = "devDependencies";
      currentDep = null;
      continue;
    }
    // optionalDependencies are real edges: include them so that packages
    // reached only through an optional dep are still traceable.
    if (/^    optionalDependencies:$/.test(line)) {
      currentSection = "optionalDependencies";
      currentDep = null;
      continue;
    }
    // Other 4-space key: leave the current section.
    if (/^    \w/.test(line)) {
      currentSection = null;
      currentDep = null;
      continue;
    }

    if (!currentSection) continue;

    // Dep name at 6-space indent (e.g. "      zod:").
    if (/^      [^\s].*:$/.test(line)) {
      currentDep = line.trim().slice(0, -1).replace(/^'|'$/g, "");
      continue;
    }

    if (!currentDep) continue;

    // version: field at 8-space indent.
    if (/^        version:/.test(line)) {
      const versionMatch = line.match(/^        version:\s+(.+)$/);
      if (versionMatch) {
        const version = versionMatch[1].trim().replace(/^'|'$/g, "");
        // Skip workspace links.
        if (!version.startsWith("link:")) {
          result.get(currentImporter)?.set(currentDep, `${currentDep}@${version}`);
        }
      }
    }
  }

  return result;
}

/**
 * Extract the bare package name from a lockfile key.
 * @param {string} lockKey
 * @returns {string}
 */
export function pkgNameFromLockKey(lockKey) {
  const atIdx = lockKey.lastIndexOf("@");
  if (atIdx <= 0) return lockKey;
  return lockKey.slice(0, atIdx);
}

/**
 * Extract the version string from a lockfile key.
 * @param {string} lockKey
 * @returns {string | null}
 */
export function versionFromLockKey(lockKey) {
  const atIdx = lockKey.lastIndexOf("@");
  if (atIdx <= 0) return null;
  return lockKey.slice(atIdx + 1);
}

/**
 * Strip the peer-resolution suffix from a pnpm v9 lockfile key so only the
 * bare `name@version` portion remains.  For example:
 *   "vitest@3.2.7(@types/node@22.20.1)(tsx@4.23.12)" → "vitest@3.2.7"
 *
 * @param {string} lockKey
 * @returns {string}
 */
export function stripPeerSuffix(lockKey) {
  const peerIdx = lockKey.indexOf("(");
  return peerIdx === -1 ? lockKey : lockKey.slice(0, peerIdx);
}

/**
 * Parse the `snapshots:` section of a pnpm v9 lockfile and return the set of
 * bare `name@version` keys (peer suffix stripped) that have `optional: true`.
 *
 * These entries are intentionally absent on platforms they are not built for
 * (e.g. `@esbuild/darwin-arm64` on Linux, `fsevents` on non-macOS).  They
 * must not be reported as unexpected store gaps.
 *
 * @param {string} text  Full lockfile text.
 * @returns {Set<string>}  bare `name@version` keys marked optional in snapshots.
 */
export function parseSnapshotOptionals(text) {
  /** @type {Set<string>} */
  const result = new Set();
  const lines = text.split("\n");
  let inSnapshots = false;
  let currentKey = /** @type {string | null} */ (null);

  for (const line of lines) {
    // Detect top-level section headers (no leading spaces).
    if (/^\w[^:]*:/.test(line)) {
      inSnapshots = line.startsWith("snapshots:");
      currentKey = null;
      continue;
    }
    if (!inSnapshots) continue;

    // A snapshot package entry starts with exactly two spaces followed by a
    // non-space character and ends with `:` or `: {}` (inline empty-map form).
    const pkgMatch =
      line.match(/^  '(.+)':\s*(?:\{\})?$/) ||
      line.match(/^  ([^\s'"{}[\]]+@[^\s'"{}[\]]+):\s*(?:\{\})?$/);
    if (pkgMatch) {
      currentKey = pkgMatch[1];
      continue;
    }

    // `optional: true` is indented four spaces inside its package block.
    if (currentKey && /^    optional: true\s*$/.test(line)) {
      result.add(stripPeerSuffix(currentKey));
    }
  }

  return result;
}

/**
 * Collects ALL resolved packages (direct + transitive) from pnpm-lock.yaml by
 * reading every entry in the `packages:` section and resolving its metadata
 * from the pnpm virtual store.
 *
 * Entries with a `directory` resolution (workspace members linked in-place) are
 * skipped — they are represented as first-class SPDX packages elsewhere.
 *
 * @param {{ lockText?: string }} [opts]
 *   - `lockText`: pre-loaded lockfile text (overrides reading from disk; used in tests).
 * @returns {{
 *   packages: { name: string; version: string; license: string; homepage: string | undefined }[];
 *   unresolved: string[];
 * }}
 *   `packages` contains every lockfile entry (with NOASSERTION fallback for
 *   entries absent from the local store).  `unresolved` lists the
 *   `name@version` keys that could not be resolved from either the hoisted
 *   node_modules or the pnpm virtual store — these entries appear in
 *   `packages` with `license: "NOASSERTION"` but are called out separately so
 *   callers can warn about potential SBOM gaps.
 */
export function collectAllTransitiveDeps({ lockText: lockTextOverride } = {}) {
  let rawLockText;
  if (lockTextOverride != null) {
    rawLockText = lockTextOverride;
  } else {
    const lockPath = join(ROOT, "pnpm-lock.yaml");
    if (!existsSync(lockPath)) return { packages: [], unresolved: [] };
    rawLockText = readFileSync(lockPath, "utf8");
  }

  const lockPackages = parseLockfilePackages(rawLockText);

  // Build the set of packages marked `optional: true` in the snapshots section.
  // These are intentionally absent on platforms they are not built for (e.g.
  // `@esbuild/darwin-arm64` on Linux, `fsevents` on non-macOS).  Absence of an
  // optional package is expected and must not be reported as a store gap.
  const snapshotOptionals = parseSnapshotOptionals(rawLockText);

  const pnpmStore = join(ROOT, "node_modules", ".pnpm");
  const storeExists = existsSync(pnpmStore);
  /** @type {string[]} */
  const storeEntries = storeExists ? readdirSync(pnpmStore) : [];

  /** @type {Map<string, { name: string; version: string; license: string; homepage: string | undefined }>} */
  const seen = new Map();

  /** @type {string[]} */
  const unresolved = [];

  for (const [lockKey, resolution] of lockPackages) {
    // Skip workspace packages resolved from a local directory.
    if ("directory" in resolution) continue;

    // Strip peer suffix to obtain "name@version".
    const bare = stripPeerSuffix(lockKey);
    const atIdx = bare.lastIndexOf("@");
    if (atIdx <= 0) continue;
    const name = bare.slice(0, atIdx);
    const version = bare.slice(atIdx + 1);
    if (!name || !version) continue;

    const key = `${name}@${version}`;
    if (seen.has(key)) continue;

    let depPkg = null;

    // 1. Try hoisted node_modules (fastest path).
    const directPath = join(ROOT, "node_modules", name, "package.json");
    if (existsSync(directPath)) {
      try {
        const p = JSON.parse(readFileSync(directPath, "utf8"));
        // Only use it when the version matches exactly.
        if (String(p["version"] ?? "") === version) depPkg = p;
      } catch {
        // ignore
      }
    }

    // 2. Probe the pnpm virtual store (.pnpm/<name@version>/node_modules/<name>).
    //    pnpm encodes scoped names with "+" and may append a peer hash/suffix.
    if (!depPkg && storeExists) {
      const folderPrefix = name.replace(/\//g, "+") + "@" + version;
      for (const entry of storeEntries) {
        if (
          entry === folderPrefix ||
          entry.startsWith(folderPrefix + "(") ||
          entry.startsWith(folderPrefix + "_")
        ) {
          const candidate = join(
            pnpmStore,
            entry,
            "node_modules",
            name,
            "package.json",
          );
          if (existsSync(candidate)) {
            try {
              depPkg = JSON.parse(readFileSync(candidate, "utf8"));
              break;
            } catch {
              // ignore
            }
          }
        }
      }
    }

    // Whether or not we found the package in the local store, always emit an
    // SBOM entry.  For packages not installed on this platform (e.g. optional
    // OS-specific binaries like @esbuild/darwin-arm64 on Linux) we use a
    // NOASSERTION fallback so that the SBOM covers every resolved package in
    // the lockfile rather than silently omitting uninstalled entries.
    seen.set(key, {
      name: depPkg != null ? String(depPkg["name"] ?? name) : name,
      version:
        depPkg != null ? String(depPkg["version"] ?? version) : version,
      license:
        depPkg != null
          ? String(depPkg["license"] ?? "NOASSERTION")
          : "NOASSERTION",
      homepage:
        depPkg != null && depPkg["homepage"] != null
          ? String(depPkg["homepage"])
          : undefined,
    });

    // Track packages that could not be found in the local store so callers can
    // warn about potential SBOM gaps (e.g. after a partial `pnpm store prune`
    // or a failed install).
    //
    // Packages marked `optional: true` in the snapshots section are intentionally
    // absent on platforms they are not built for — exclude them from the warning.
    if (depPkg === null && !snapshotOptionals.has(key)) {
      unresolved.push(key);
    }
  }

  return { packages: [...seen.values()], unresolved };
}

/**
 * Classify a parsed resolution object as OK or a specific violation type.
 *
 * @param {Record<string, string>} resolution
 * @returns {"ok" | "directory" | "git" | "tarball-foreign" | "tarball-http-npm" | "no-resolution" | "unknown"}
 */
export function classifyResolution(resolution) {
  if ("directory" in resolution) return "directory";
  if ("repo" in resolution || "commit" in resolution) return "git";
  if ("tarball" in resolution) {
    const t = resolution.tarball ?? "";
    if (t.startsWith("https://registry.npmjs.org/")) return "ok";
    if (t.startsWith("http://registry.npmjs.org/")) return "tarball-http-npm";
    return "tarball-foreign";
  }
  if ("integrity" in resolution) return "ok";
  if (Object.keys(resolution).length === 0) return "no-resolution";
  return "unknown";
}

/**
 * Fetch npm registry version metadata for a package.
 *
 * @param {string} name     Package name (possibly scoped)
 * @param {string} version  Exact version string
 * @returns {Promise<{ integrity?: string; tarball?: string; [k: string]: unknown }>}
 */
export function fetchNpmVersionMeta(name, version) {
  const url = `${NPM_REGISTRY}${encodeURIComponent(name).replace(/%40/g, "@")}/${version}`;

  return new Promise((resolveP, rejectP) => {
    const req = get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "ascended-core-third-party-compliance/1.0 (node)",
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          rejectP(new Error(`npm registry returned HTTP ${res.statusCode} for ${url}`));
          return;
        }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            resolveP(parsed.dist ?? {});
          } catch (e) {
            rejectP(new Error(`failed to parse npm registry response for ${url}: ${e?.message}`));
          }
        });
      },
    );
    req.setTimeout(15_000, () => {
      req.destroy(new Error(`timeout fetching ${url}`));
    });
    req.on("error", rejectP);
  });
}

// ─── SBOM utilities (exported for tests) ─────────────────────────────────────

/** Licenses that are accepted in Ascended Core packages. */
export const ALLOWED_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "CC0-1.0",
  "CC-BY-4.0",
  "0BSD",
  "Unlicense",
]);

/**
 * Returns the parsed package.json for every non-private workspace package
 * whose name starts with "@third-eye-cyborg/".
 *
 * @returns {{ dir: string; pkg: Record<string, unknown> }[]}
 */
export function readWorkspacePackages() {
  const packagesDir = join(ROOT, "packages");
  /** @type {{ dir: string; pkg: Record<string, unknown> }[]} */
  const out = [];
  for (const entry of readdirSync(packagesDir)) {
    const dir = join(packagesDir, entry);
    const pkgPath = join(dir, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = /** @type {Record<string, unknown>} */ (
      JSON.parse(readFileSync(pkgPath, "utf8"))
    );
    if (pkg["private"] || !String(pkg["name"] ?? "").startsWith("@third-eye-cyborg/"))
      continue;
    out.push({ dir, pkg });
  }
  return out;
}

/**
 * Collects direct runtime dependencies of each workspace package from the
 * installed node_modules tree.
 *
 * @param {string} dir  Absolute path to the package directory.
 * @param {Record<string, unknown>} pkg  Parsed package.json.
 * @returns {{ name: string; version: string; license: string; homepage: string | undefined }[]}
 */
export function collectDeps(dir, pkg) {
  const deps = Object.keys(
    /** @type {Record<string, string>} */ (pkg["dependencies"] ?? {}),
  );
  /** @type {{ name: string; version: string; license: string; homepage: string | undefined }[]} */
  const out = [];
  for (const dep of deps) {
    const candidates = [
      join(dir, "node_modules", dep, "package.json"),
      join(ROOT, "node_modules", dep, "package.json"),
    ];
    let depPkg = null;
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          depPkg = JSON.parse(readFileSync(candidate, "utf8"));
          break;
        } catch {
          // ignore
        }
      }
    }
    if (!depPkg) {
      const pnpmStore = join(ROOT, "node_modules", ".pnpm");
      if (existsSync(pnpmStore)) {
        const depFolderName = dep.replace("/", "+");
        for (const storeEntry of readdirSync(pnpmStore)) {
          if (!storeEntry.startsWith(depFolderName + "@")) continue;
          const candidate = join(
            pnpmStore,
            storeEntry,
            "node_modules",
            dep,
            "package.json",
          );
          if (existsSync(candidate)) {
            try {
              depPkg = JSON.parse(readFileSync(candidate, "utf8"));
            } catch {
              // ignore
            }
            break;
          }
        }
      }
    }
    if (!depPkg) continue;
    out.push({
      name: String(depPkg["name"] ?? dep),
      version: String(depPkg["version"] ?? "NOASSERTION"),
      license: String(depPkg["license"] ?? "NOASSERTION"),
      homepage:
        depPkg["homepage"] != null ? String(depPkg["homepage"]) : undefined,
    });
  }
  return out;
}

/**
 * Builds an SPDX 2.3 JSON SBOM document from all workspace packages.
 *
 * @param {{
 *   timestamp?: string;
 *   namespace?: string;
 *   warn?: (message: string) => void;
 *   _lockText?: string;
 * }} [opts]
 *   - `warn`: called with a warning message when lockfile entries could not be
 *     resolved from the local store.  Defaults to writing to `process.stderr`.
 *     Provide a custom function in tests to capture warnings without side-effects.
 *   - `_lockText`: override the lockfile text (used in tests; not a public API).
 * @returns {Record<string, unknown>}
 */
export function generateSbom(opts = {}) {
  const timestamp =
    opts.timestamp ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const packages = readWorkspacePackages();

  const rootPkgPath = join(ROOT, "package.json");
  const rootPkg = /** @type {Record<string, unknown>} */ (
    JSON.parse(readFileSync(rootPkgPath, "utf8"))
  );
  const rootVersion = String(rootPkg["version"] ?? "0.0.0");
  const rootName = String(rootPkg["name"] ?? "ascended-core");

  /** Deterministic SPDXID from a string. */
  const toSpdxId = (/** @type {string} */ s) =>
    "SPDXRef-" +
    s
      .replace(/^@/, "")
      .replace(/\//g, "-")
      .replace(/[^A-Za-z0-9.\-]/g, "-");

  // Build a deduplicated map of ALL resolved packages (direct + transitive)
  // sourced from the full pnpm-lock.yaml dependency graph.
  const { packages: transitiveDeps, unresolved } = collectAllTransitiveDeps({
    lockText: opts._lockText,
  });

  // Warn when lockfile entries couldn't be resolved from the local store — this
  // indicates the SBOM may be incomplete (e.g. after a partial `pnpm store
  // prune` or a failed install).  The entries still appear in the SBOM with
  // NOASSERTION fields but their metadata is unverified.
  if (unresolved.length > 0) {
    const warnFn =
      opts.warn ??
      ((msg) => {
        process.stderr.write(msg);
      });
    const list = unresolved.map((k) => `  - ${k}`).join("\n");
    warnFn(
      `warning: ${unresolved.length} lockfile package(s) could not be resolved ` +
        `from the local store and may have incomplete metadata in the SBOM ` +
        `(license/homepage fields will show NOASSERTION).\n` +
        `This can happen after \`pnpm store prune\` or a failed install.\n` +
        `Unresolved packages:\n${list}\n`,
    );
  }

  /** @type {Map<string, { name: string; version: string; license: string; homepage: string | undefined }>} */
  const depMap = new Map();
  for (const dep of transitiveDeps) {
    const key = `${dep.name}@${dep.version}`;
    if (!depMap.has(key)) depMap.set(key, dep);
  }

  /** @type {Record<string, unknown>[]} */
  const spdxPackages = [];
  /** @type {Record<string, unknown>[]} */
  const relationships = [];

  spdxPackages.push({
    SPDXID: "SPDXRef-Package-root",
    name: rootName,
    versionInfo: rootVersion,
    downloadLocation: "https://github.com/third-eye-cyborg/ascended-core",
    filesAnalyzed: false,
    licenseConcluded: "Apache-2.0",
    licenseDeclared: "Apache-2.0",
    copyrightText: "NOASSERTION",
  });

  relationships.push({
    spdxElementId: "SPDXRef-DOCUMENT",
    relationshipType: "DESCRIBES",
    relatedSpdxElement: "SPDXRef-Package-root",
  });

  for (const { pkg } of packages) {
    const name = String(pkg["name"] ?? "unknown");
    const version = String(pkg["version"] ?? "0.0.0");
    const license = String(pkg["license"] ?? "NOASSERTION");
    const spdxId = toSpdxId(name);
    spdxPackages.push({
      SPDXID: spdxId,
      name,
      versionInfo: version,
      downloadLocation: `https://www.npmjs.com/package/${name}`,
      filesAnalyzed: false,
      licenseConcluded: license,
      licenseDeclared: license,
      copyrightText: "NOASSERTION",
    });
    relationships.push({
      spdxElementId: "SPDXRef-Package-root",
      relationshipType: "CONTAINS",
      relatedSpdxElement: spdxId,
    });
  }

  for (const [, dep] of depMap) {
    const spdxId = toSpdxId(`${dep.name}-${dep.version}`);
    spdxPackages.push({
      SPDXID: spdxId,
      name: dep.name,
      versionInfo: dep.version,
      downloadLocation:
        dep.homepage ?? `https://www.npmjs.com/package/${dep.name}`,
      filesAnalyzed: false,
      licenseConcluded: dep.license,
      licenseDeclared: dep.license,
      copyrightText: "NOASSERTION",
    });
  }

  // ── Build DYNAMIC_LINK relationships from the actual dep graph ──────────────

  const lockPath = join(ROOT, "pnpm-lock.yaml");
  const lockText = existsSync(lockPath) ? readFileSync(lockPath, "utf8") : "";
  const snapshots = parseLockfileSnapshots(lockText);
  const importerDepsMap = parseLockfileImporterDeps(lockText);

  /** Emit one directed DYNAMIC_LINK edge if the child is a known external dep. */
  const addDepEdge = (
    /** @type {Map<string, Set<string>>} */ edges,
    /** @type {string} */ parentSpdxId,
    /** @type {string} */ childSnapshotKey,
  ) => {
    const bare = stripPeerSuffix(childSnapshotKey);
    const atIdx = bare.lastIndexOf("@");
    if (atIdx <= 0) return;
    const name = bare.slice(0, atIdx);
    const version = bare.slice(atIdx + 1);
    if (name.startsWith("@third-eye-cyborg/")) return; // workspace package — not an external dep
    if (!depMap.has(`${name}@${version}`)) return; // not tracked in the SBOM
    const childSpdxId = toSpdxId(`${name}-${version}`);
    if (!edges.has(parentSpdxId)) edges.set(parentSpdxId, new Set());
    edges.get(parentSpdxId)?.add(childSpdxId);
  };

  /** @type {Map<string, Set<string>>} */
  const depEdges = new Map();

  // 1. Workspace packages → their direct external deps (via importers: section).
  for (const { dir, pkg } of packages) {
    const wsName = String(pkg["name"] ?? "");
    const wsSpdxId = toSpdxId(wsName);
    const importerPath = relative(ROOT, dir);
    const importerMap = importerDepsMap.get(importerPath);
    if (importerMap) {
      for (const [, snapshotKey] of importerMap) {
        addDepEdge(depEdges, wsSpdxId, snapshotKey);
      }
    }
  }

  // 2. Root monorepo "." → its direct external deps (e.g. root-level devDeps).
  const rootImporterMap = importerDepsMap.get(".");
  if (rootImporterMap) {
    for (const [, snapshotKey] of rootImporterMap) {
      addDepEdge(depEdges, "SPDXRef-Package-root", snapshotKey);
    }
  }

  // 3. Every external package → its own transitive deps (via snapshots: section).
  for (const [snapshotKey, snapDeps] of snapshots) {
    const bare = stripPeerSuffix(snapshotKey);
    const atIdx = bare.lastIndexOf("@");
    if (atIdx <= 0) continue;
    const name = bare.slice(0, atIdx);
    const version = bare.slice(atIdx + 1);
    if (name.startsWith("@third-eye-cyborg/")) continue;
    if (!depMap.has(`${name}@${version}`)) continue;
    const parentSpdxId = toSpdxId(`${name}-${version}`);
    for (const { resolvedKey } of snapDeps) {
      addDepEdge(depEdges, parentSpdxId, resolvedKey);
    }
  }

  // Collect the full set of child SPDX IDs that have been targeted by at least
  // one DYNAMIC_LINK edge so we can emit a root-fallback for any orphan.
  /** @type {Set<string>} */
  const linkedSpdxIds = new Set();
  for (const children of depEdges.values()) {
    for (const id of children) linkedSpdxIds.add(id);
  }

  // Emit all graph-derived DYNAMIC_LINK relationships.
  for (const [parentSpdxId, children] of depEdges) {
    for (const childSpdxId of children) {
      relationships.push({
        spdxElementId: parentSpdxId,
        relationshipType: "DYNAMIC_LINK",
        relatedSpdxElement: childSpdxId,
      });
    }
  }

  // Fallback: packages unreachable through the graph get linked from root to
  // guarantee the SBOM is complete (should be rare — mainly optional platform
  // binaries or packages pulled in via the root importers we didn't handle).
  for (const [, dep] of depMap) {
    const spdxId = toSpdxId(`${dep.name}-${dep.version}`);
    if (!linkedSpdxIds.has(spdxId)) {
      relationships.push({
        spdxElementId: "SPDXRef-Package-root",
        relationshipType: "DYNAMIC_LINK",
        relatedSpdxElement: spdxId,
      });
    }
  }

  const nsInput = `ascended-core-${rootVersion}-${timestamp}`;
  const nsHash = createHash("sha256")
    .update(nsInput)
    .digest("hex")
    .slice(0, 16);
  const namespace =
    opts.namespace ??
    `https://spdx.org/spdxdocs/ascended-core-${rootVersion}-${nsHash}`;

  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `${rootName}-${rootVersion}`,
    documentNamespace: namespace,
    creationInfo: {
      created: timestamp,
      creators: [
        "Tool: third-party-compliance.mjs",
        "Organization: Ascended Core contributors",
      ],
    },
    packages: spdxPackages,
    relationships,
  };
}

/**
 * Checks that every workspace package declares an allowed license.
 * @returns {{ name: string; license: string }[]}  Violations (empty = pass).
 */
export function checkLicenses() {
  const packages = readWorkspacePackages();
  /** @type {{ name: string; license: string }[]} */
  const violations = [];
  for (const { pkg } of packages) {
    const license = String(pkg["license"] ?? "");
    if (!ALLOWED_LICENSES.has(license)) {
      violations.push({ name: String(pkg["name"] ?? "?"), license });
    }
  }
  return violations;
}

// ─── trace ────────────────────────────────────────────────────────────────────

/**
 * Trace all dependency paths from workspace packages to a given package.
 *
 * Builds the dep graph in-memory directly from pnpm-lock.yaml's `importers:`
 * and `snapshots:` sections — which contain only real dependency edges — then
 * walks every simple path from workspace roots to the target using DFS with a
 * visited-set cycle guard.
 *
 * This intentionally does NOT use the SBOM's `relationships` array.  The SBOM
 * generator appends synthetic root→package fallback edges for packages with
 * no real inbound edges (optional platform binaries, orphaned entries, etc.).
 * Using those fallbacks would fabricate dep chains that don't exist.  Such
 * packages are correctly reported here as "unreachable from workspace packages".
 *
 * @param {string} target  Package specifier — "name@version" or bare "name".
 *   A bare name matches any installed version (useful when the exact version
 *   is not yet known).
 * @param {{
 *   json?: boolean;
 *   _lockText?: string;
 *   _workspaceRoots?: Map<string, string>;
 * }} [opts]
 *   - `json`: emit machine-readable JSON instead of human-readable text.
 *   - `_lockText`: override lockfile text (used in tests; not a public API).
 *   - `_workspaceRoots`: `Map<importerPath, "name@version">` used instead of
 *     reading workspace packages from disk (used in tests; not a public API).
 */
export function tracePackage(target, opts = {}) {
  // ── 1. Load lockfile ───────────────────────────────────────────────────────
  let lockText;
  if (opts._lockText != null) {
    lockText = opts._lockText;
  } else {
    const lockPath = join(ROOT, "pnpm-lock.yaml");
    if (!existsSync(lockPath)) {
      if (opts.json) {
        process.stdout.write(
          JSON.stringify(
            { target, found: false, paths: [], error: "pnpm-lock.yaml not found" },
            null,
            2,
          ) + "\n",
        );
      } else {
        console.log(`trace: pnpm-lock.yaml not found — run \`pnpm install\` first.`);
      }
      return;
    }
    lockText = readFileSync(lockPath, "utf8");
  }

  // ── 2. Parse the three lockfile sections we need ───────────────────────────
  const snapshots = parseLockfileSnapshots(lockText);
  const importerDepsMap = parseLockfileImporterDeps(lockText);
  const lockPkgs = parseLockfilePackages(lockText);

  // ── 3. Determine workspace root labels (importerPath → "name@version") ─────
  /** @type {Map<string, string>} */
  let rootLabels;
  if (opts._workspaceRoots != null) {
    rootLabels = opts._workspaceRoots;
  } else {
    rootLabels = new Map();
    const rootPkgPath = join(ROOT, "package.json");
    if (existsSync(rootPkgPath)) {
      const rootPkg = /** @type {Record<string,unknown>} */ (
        JSON.parse(readFileSync(rootPkgPath, "utf8"))
      );
      rootLabels.set(
        ".",
        `${rootPkg["name"] ?? "root"}@${rootPkg["version"] ?? "0.0.0"}`,
      );
    }
    for (const { dir, pkg } of readWorkspacePackages()) {
      rootLabels.set(
        relative(ROOT, dir),
        `${pkg["name"]}@${pkg["version"] ?? "0.0.0"}`,
      );
    }
  }

  // ── 4. Build adjacency list (label → Set<label>) from real dep edges only ──
  //
  // Two sources of real edges:
  //   a) importers: section  — workspace package → its direct external deps
  //   b) snapshots: section  — external package  → its own transitive deps
  //
  // `optionalDependencies:` in snapshots is intentionally excluded: those
  // edges represent OS/platform-conditional pulls that pnpm resolves outside
  // the normal dep graph.  Optional platform binaries (e.g. @esbuild/linux-x64)
  // are therefore correctly "unreachable" in the trace output.

  /** @type {Map<string, Set<string>>} */
  const edges = new Map();

  for (const [importerPath, depMap] of importerDepsMap) {
    const parentLabel = rootLabels.get(importerPath);
    if (parentLabel == null) continue;
    if (!edges.has(parentLabel)) edges.set(parentLabel, new Set());
    for (const [, snapshotKey] of depMap) {
      const bare = stripPeerSuffix(snapshotKey);
      if (!bare.startsWith("@third-eye-cyborg/")) edges.get(parentLabel)?.add(bare);
    }
  }

  for (const [snapshotKey, deps] of snapshots) {
    const parentBare = stripPeerSuffix(snapshotKey);
    if (parentBare.startsWith("@third-eye-cyborg/")) continue;
    if (!edges.has(parentBare)) edges.set(parentBare, new Set());
    for (const { resolvedKey } of deps) {
      const childBare = stripPeerSuffix(resolvedKey);
      if (!childBare.startsWith("@third-eye-cyborg/")) edges.get(parentBare)?.add(childBare);
    }
  }

  // ── 5. Collect all known external package labels from packages: section ────
  /** @type {Set<string>} */
  const allKnown = new Set();
  for (const [lockKey, resolution] of lockPkgs) {
    if ("directory" in resolution) continue; // workspace link — not external
    const bare = stripPeerSuffix(lockKey);
    if (!bare.startsWith("@third-eye-cyborg/")) allKnown.add(bare);
  }

  // ── 6. Find labels that match the requested target spec ───────────────────
  // A leading "@" is part of a scoped package name, not a version separator,
  // so we use lastIndexOf and require atIdx > 0 to identify the version part.
  const atIdx = target.lastIndexOf("@");
  const hasVersion = atIdx > 0;
  const targetName = hasVersion ? target.slice(0, atIdx) : target;
  const targetVersion = hasVersion ? target.slice(atIdx + 1) : null;

  /** @type {string[]} */
  const matchingLabels = [];
  for (const label of allKnown) {
    const lAt = label.lastIndexOf("@");
    const lName = lAt > 0 ? label.slice(0, lAt) : label;
    const lVer = lAt > 0 ? label.slice(lAt + 1) : null;
    if (lName === targetName && (targetVersion === null || lVer === targetVersion)) {
      matchingLabels.push(label);
    }
  }

  if (matchingLabels.length === 0) {
    if (opts.json) {
      process.stdout.write(
        JSON.stringify({ target, found: false, paths: [] }, null, 2) + "\n",
      );
    } else {
      console.log(`trace: "${target}" not found in dep graph.`);
    }
    return;
  }

  // ── 7. DFS from workspace roots → all simple paths to matching targets ─────
  // Each stack frame carries the current path (array) and a visited set (for
  // O(1) cycle detection).  A new Set is created per frame so sibling branches
  // do not share state.
  const roots = new Set(rootLabels.values());
  /** @type {string[][]} */
  const allPaths = [];

  for (const targetLabel of matchingLabels) {
    for (const root of roots) {
      /** @type {Array<[string[], Set<string>]>} */
      const stack = [[[root], new Set([root])]];
      while (stack.length > 0) {
        const item = stack.pop();
        if (!item) continue;
        const [path, visited] = item;
        const node = path[path.length - 1];
        if (node === targetLabel) {
          allPaths.push(path);
          continue;
        }
        const children = edges.get(node);
        if (!children) continue;
        for (const child of children) {
          if (!visited.has(child)) {
            stack.push([[...path, child], new Set([...visited, child])]);
          }
        }
      }
    }
  }

  // ── 8. Output ──────────────────────────────────────────────────────────────
  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        {
          target,
          found: true,
          matchCount: matchingLabels.length,
          pathCount: allPaths.length,
          paths: allPaths,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  if (allPaths.length === 0) {
    console.log(
      `trace: "${target}" exists in the dep graph (${matchingLabels.join(", ")}) ` +
        `but is unreachable from workspace packages.\n` +
        `It may be an optional platform-specific package with no direct dependents ` +
        `in the workspace.`,
    );
    return;
  }

  console.log(
    `trace: ${allPaths.length} path${allPaths.length === 1 ? "" : "s"} to "${target}":\n`,
  );
  for (const path of allPaths) {
    console.log("  " + path.join(" → "));
  }
}

// ─── supply-chain main ────────────────────────────────────────────────────────

async function runComplianceChecks() {
  const DRY_RUN = process.argv.includes("--dry-run");
  const SKIP_NETWORK = process.argv.includes("--skip-network");

  // ── 1. Load policy ─────────────────────────────────────────────────────────

  const POLICY_PATH = join(ROOT, "compliance", "license-policy.json");
  if (!existsSync(POLICY_PATH)) {
    console.error(
      `error: compliance/license-policy.json not found at ${POLICY_PATH}\n` +
        `Create the file and list every approved external production dependency.`,
    );
    process.exit(1);
  }

  /** @type {{ version: string; approvedPackages: { name: string; allowedLicenses: string[]; repository: string }[] }} */
  const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));

  /** @type {Map<string, { allowedLicenses: string[]; repository: string }>} */
  const policyMap = new Map(
    (policy.approvedPackages ?? []).map((p) => [p.name, p]),
  );

  // ── 2. Collect external production deps ────────────────────────────────────

  const PACKAGES_DIR = join(ROOT, "packages");

  /** @type {Map<string, string[]>} */
  const depUsage = new Map();

  for (const dir of readdirSync(PACKAGES_DIR)) {
    const pkgPath = join(PACKAGES_DIR, dir, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (pkg.private) continue;
    if (!pkg.name?.startsWith("@third-eye-cyborg/")) continue;
    for (const depName of Object.keys(pkg.dependencies ?? {})) {
      if (depName.startsWith("@third-eye-cyborg/")) continue;
      if (!depUsage.has(depName)) depUsage.set(depName, []);
      depUsage.get(depName).push(pkg.name);
    }
  }

  const externalProdDeps = [...depUsage.keys()].sort();

  if (externalProdDeps.length === 0) {
    console.log(
      "third-party-compliance: no external production dependencies found — nothing to check.",
    );
    process.exit(0);
  }

  // ── 3. Parse registry config ───────────────────────────────────────────────

  const npmrc = parseNpmrc(join(ROOT, ".npmrc"));

  // ── 4. Parse pnpm-lock.yaml ────────────────────────────────────────────────

  const LOCKFILE_PATH = join(ROOT, "pnpm-lock.yaml");
  if (!existsSync(LOCKFILE_PATH)) {
    console.error(`error: pnpm-lock.yaml not found at ${LOCKFILE_PATH}`);
    process.exit(1);
  }
  const lockPackages = parseLockfilePackages(readFileSync(LOCKFILE_PATH, "utf8"));

  // ── 5. Run checks ──────────────────────────────────────────────────────────

  /** @type {{ dep: string; check: string; message: string }[]} */
  const violations = [];
  /** @type {{ dep: string; message: string }[]} */
  const warnings = [];

  for (const depName of externalProdDeps) {
    const usedBy = depUsage.get(depName) ?? [];

    if (!policyMap.has(depName)) {
      violations.push({
        dep: depName,
        check: "policy",
        message:
          `"${depName}" is a production dependency (used by: ${usedBy.join(", ")}) ` +
          `but is not listed in compliance/license-policy.json.`,
      });
      continue;
    }

    const entry = policyMap.get(depName);

    const reg = effectiveRegistry(depName, npmrc, {});
    const normReg = reg.endsWith("/") ? reg : reg + "/";
    if (normReg !== NPM_REGISTRY) {
      violations.push({
        dep: depName,
        check: "registry-config",
        message:
          `The effective registry for "${depName}" is "${reg}", not "${NPM_REGISTRY}". ` +
          `Check .npmrc. Used by: ${usedBy.join(", ")}.`,
      });
    }

    /** @type {Array<{ lockKey: string; resolution: Record<string,string>; version: string }>} */
    const lockEntries = [];
    for (const [lockKey, resolution] of lockPackages) {
      if (pkgNameFromLockKey(lockKey) === depName) {
        const version = versionFromLockKey(lockKey) ?? "";
        lockEntries.push({ lockKey, resolution, version });
      }
    }

    if (lockEntries.length === 0) {
      violations.push({
        dep: depName,
        check: "lockfile-provenance",
        message:
          `"${depName}" has no entry in pnpm-lock.yaml — run \`pnpm install\`. ` +
          `Used by: ${usedBy.join(", ")}.`,
      });
    } else {
      for (const { lockKey, resolution } of lockEntries) {
        const kind = classifyResolution(resolution);
        if (kind === "ok") continue;
        if (kind === "directory") {
          violations.push({ dep: depName, check: "lockfile-provenance",
            message: `"${lockKey}" resolves from a local directory ("${resolution.directory}"). Used by: ${usedBy.join(", ")}.` });
        } else if (kind === "git") {
          violations.push({ dep: depName, check: "lockfile-provenance",
            message: `"${lockKey}" resolves from a git source (repo: ${resolution.repo ?? "(unknown)"}, commit: ${resolution.commit ?? "(unknown)"}). Used by: ${usedBy.join(", ")}.` });
        } else if (kind === "tarball-http-npm") {
          violations.push({ dep: depName, check: "lockfile-provenance",
            message: `"${lockKey}" uses an HTTP (not HTTPS) tarball URL to registry.npmjs.org. Used by: ${usedBy.join(", ")}.` });
        } else if (kind === "tarball-foreign") {
          violations.push({ dep: depName, check: "lockfile-provenance",
            message: `"${lockKey}" resolves from a non-registry tarball URL: "${resolution.tarball}". Used by: ${usedBy.join(", ")}.` });
        } else if (kind === "no-resolution") {
          violations.push({ dep: depName, check: "lockfile-provenance",
            message: `"${lockKey}" has no resolution metadata (empty-map form); run \`pnpm install\` to rebuild the lockfile with integrity hashes. Used by: ${usedBy.join(", ")}.` });
        } else {
          violations.push({ dep: depName, check: "lockfile-provenance",
            message: `"${lockKey}" has an unrecognised resolution format (${JSON.stringify(resolution)}). Used by: ${usedBy.join(", ")}.` });
        }
      }
    }

    if (SKIP_NETWORK) {
      warnings.push({ dep: depName, message: `"${depName}" integrity cross-reference skipped (--skip-network).` });
    } else {
      for (const { lockKey, resolution, version } of lockEntries) {
        const lockIntegrity = resolution.integrity ?? "";
        if (!lockIntegrity || !version) {
          warnings.push({ dep: depName, message: `"${lockKey}" has no integrity hash; skipping npm cross-reference.` });
          continue;
        }
        try {
          const dist = await fetchNpmVersionMeta(depName, version);
          const npmIntegrity = dist.integrity ?? "";
          if (!npmIntegrity) {
            warnings.push({ dep: depName, message: `npm did not return dist.integrity for "${lockKey}"; cross-reference inconclusive.` });
          } else if (npmIntegrity !== lockIntegrity) {
            violations.push({ dep: depName, check: "npm-integrity",
              message: `"${lockKey}" integrity mismatch.\n    lockfile : ${lockIntegrity}\n    npm dist : ${npmIntegrity}\nUsed by: ${usedBy.join(", ")}.` });
          }
        } catch (err) {
          warnings.push({ dep: depName, message: `Could not reach npm for "${lockKey}": ${err?.message ?? err}. Skipped.` });
        }
      }
    }

    const installedPkgPath = join(ROOT, "node_modules", depName, "package.json");
    if (existsSync(installedPkgPath)) {
      const installedPkg = JSON.parse(readFileSync(installedPkgPath, "utf8"));
      const raw = installedPkg.repository ?? "";
      const repoUrl = typeof raw === "string" ? raw : (raw.url ?? "");
      const expectedNorm = normaliseRepoUrl(entry.repository ?? "");
      const actualNorm = normaliseRepoUrl(repoUrl);
      if (entry.repository && repoUrl && actualNorm !== expectedNorm) {
        violations.push({ dep: depName, check: "repository-url",
          message: `"${depName}" repository URL mismatch. Policy: "${entry.repository}" (norm: "${expectedNorm}"), installed: "${repoUrl}" (norm: "${actualNorm}").` });
      } else if (entry.repository && !repoUrl) {
        warnings.push({ dep: depName, message: `"${depName}" has no repository field in installed package.json.` });
      }
    } else {
      warnings.push({ dep: depName, message: `"${depName}" not in node_modules; skipping repository-URL check.` });
    }
  }

  // ── 6. Report ───────────────────────────────────────────────────────────────

  for (const w of warnings) {
    console.warn(`warning [${w.dep}]: ${w.message}`);
  }

  if (violations.length === 0) {
    const network = SKIP_NETWORK ? " (network check skipped)" : "";
    console.log(
      `third-party-compliance: all ${externalProdDeps.length} external production ` +
        `dependenc${externalProdDeps.length === 1 ? "y" : "ies"} verified — ` +
        `policy approved, registry config clean, lockfile resolves from registry.npmjs.org${network}.`,
    );
    process.exit(0);
  }

  console.error(
    `\nthird-party-compliance: ${violations.length} violation${violations.length === 1 ? "" : "s"} found:\n`,
  );
  for (const v of violations) {
    console.error(`  [${v.check}] ${v.message}`);
  }
  console.error(
    `\n${violations.length} violation${violations.length === 1 ? "" : "s"} across ` +
      `${externalProdDeps.length} external production ` +
      `dependenc${externalProdDeps.length === 1 ? "y" : "ies"} checked.`,
  );

  if (DRY_RUN) {
    console.error("(--dry-run: exiting 0 despite violations)");
    process.exit(0);
  }
  process.exit(1);
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const isCli =
  process.argv[1] != null &&
  resolve(process.argv[1]) === resolve(__filename);

if (isCli) {
  const traceIdx = process.argv.indexOf("--trace");
  if (traceIdx !== -1) {
    const target = process.argv[traceIdx + 1];
    if (!target || target.startsWith("--")) {
      console.error(
        "error: --trace requires a package specifier.\n" +
          "  Examples:\n" +
          "    node scripts/checks/third-party-compliance.mjs --trace zod@3.25.76\n" +
          "    node scripts/checks/third-party-compliance.mjs --trace zod\n" +
          "    node scripts/checks/third-party-compliance.mjs --trace zod@3.25.76 --json",
      );
      process.exit(1);
    }
    const useJson = process.argv.includes("--json");
    tracePackage(target, { json: useJson });
  } else if (process.argv.includes("--sbom")) {
    const sbom = generateSbom();
    process.stdout.write(JSON.stringify(sbom, null, 2) + "\n");
  } else {
    runComplianceChecks().catch((err) => {
      console.error(`fatal: ${err?.stack ?? err}`);
      process.exit(1);
    });
  }
}

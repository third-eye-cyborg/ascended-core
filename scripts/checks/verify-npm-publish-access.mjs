/**
 * Verify that the release credential and every publishable package agree on
 * the canonical npm namespace. This script intentionally never logs raw token
 * metadata.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_NPM_USER = "thirdeyecyborg";
const EXPECTED_SCOPE = "@third-eye-cyborg";
const NPM_REGISTRY = "https://registry.npmjs.org/";
const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const packagesDir = join(rootDir, "packages");

function fail(message) {
  console.error(`npm publish preflight failed: ${message}`);
  process.exit(1);
}

function runNpm(args) {
  try {
    return execFileSync("npm", [...args, `--registry=${NPM_REGISTRY}`], {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    fail(`npm ${args[0]} could not verify the configured release credential`);
  }
}

const configuredToken =
  process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN;
if (!configuredToken) {
  fail("NODE_AUTH_TOKEN is not configured");
}

const npmUser = runNpm(["whoami"]);
if (npmUser !== EXPECTED_NPM_USER) {
  fail(`expected npm user ${EXPECTED_NPM_USER}, received ${npmUser || "none"}`);
}

let tokens;
try {
  const metadata = JSON.parse(runNpm(["token", "list", "--json"]));
  tokens = Array.isArray(metadata) ? metadata : Object.values(metadata);
} catch {
  fail("npm returned unreadable token metadata");
}

function isConfiguredToken(tokenRecord) {
  if (tokenRecord.token === configuredToken) return true;
  if (typeof tokenRecord.token !== "string") return false;

  // npm token list returns only a display prefix for real tokens. Some npm
  // versions append an ellipsis, while others emit the prefix alone.
  const [prefix, suffix] = tokenRecord.token.split(/(?:\.\.\.|…)/);
  return (
    prefix.length > 0 &&
    configuredToken.startsWith(prefix) &&
    (!suffix || configuredToken.endsWith(suffix))
  );
}

const token = tokens.find(isConfiguredToken);
if (!token) {
  fail("npm did not return metadata for the configured release credential");
}

const now = Date.now();
const active =
  !token.revoked &&
  (!token.expiry || Date.parse(token.expiry) > now);
const packageWrite = token.permissions?.some(
    (permission) =>
      permission.name === "package" && permission.action === "write",
  );
const canonicalScope = token.scopes?.some(
    (scope) =>
      scope.name === EXPECTED_SCOPE && scope.type === "package",
  );

if (
  !active ||
  token.bypass_2fa !== true ||
  !packageWrite ||
  !canonicalScope
) {
  fail(
    `the npm credential lacks active package-write access to ${EXPECTED_SCOPE} with automation/2FA bypass`,
  );
}

const publicPackages = [];
for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const manifestPath = join(packagesDir, entry.name, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.private) continue;

  if (!manifest.name?.startsWith(`${EXPECTED_SCOPE}/`)) {
    fail(`${manifestPath} is outside the ${EXPECTED_SCOPE} scope`);
  }
  if (manifest.publishConfig?.access !== "public") {
    fail(`${manifest.name} must set publishConfig.access to public`);
  }

  publicPackages.push(manifest.name);
}

if (publicPackages.length === 0) {
  fail("no public packages were found");
}

console.log(
  `npm publish preflight passed for ${publicPackages.length} public packages in ${EXPECTED_SCOPE}`,
);
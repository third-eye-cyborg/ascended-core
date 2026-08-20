/**
 * Verify that the release credential and every publishable package agree on
 * the canonical npm namespace. This script intentionally never logs raw token
 * metadata.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_NPM_USER = "thirdeyecyborg";
const EXPECTED_SCOPE = "@third-eye-cyborg";
const NPM_REGISTRY = "https://registry.npmjs.org/";
const NPM_TOKEN_PREFIX = "npm_";
const MINIMUM_DISPLAY_TOKEN_SUFFIX_LENGTH = 8;
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

export function isConfiguredToken(tokenRecord, configuredToken) {
  if (!configuredToken || !tokenRecord) return false;
  if (tokenRecord.token === configuredToken) return true;
  if (typeof tokenRecord.token !== "string") return false;

  const maskParts = tokenRecord.token.split("...");
  if (maskParts.length === 2) {
    const [prefix, suffix] = maskParts;
    return (
      prefix.length > 0 &&
      suffix.length > 0 &&
      configuredToken.startsWith(prefix) &&
      configuredToken.endsWith(suffix)
    );
  }

  // Some npm CLI versions return a display prefix without the usual
  // `prefix...suffix` mask. Require the npm token namespace plus enough
  // identifying characters to avoid accepting generic display metadata.
  return (
    tokenRecord.token.startsWith(NPM_TOKEN_PREFIX) &&
    tokenRecord.token.length >=
      NPM_TOKEN_PREFIX.length + MINIMUM_DISPLAY_TOKEN_SUFFIX_LENGTH &&
    configuredToken.startsWith(tokenRecord.token)
  );
}

export function matchingConfiguredTokens(tokens, configuredToken) {
  return tokens.filter((record) => isConfiguredToken(record, configuredToken));
}

export function uniquelyConfiguredToken(tokens, configuredToken) {
  const matches = matchingConfiguredTokens(tokens, configuredToken);
  return matches.length === 1 ? matches[0] : null;
}

function main() {
  const configuredToken =
    process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN;
  if (!configuredToken) {
    fail("NODE_AUTH_TOKEN is not configured");
  }

  const npmUser = runNpm(["whoami"]);
  if (npmUser !== EXPECTED_NPM_USER) {
    fail(
      `expected npm user ${EXPECTED_NPM_USER}, received ${npmUser || "none"}`,
    );
  }

  let tokens;
  try {
    const metadata = JSON.parse(runNpm(["token", "list", "--json"]));
    tokens = Array.isArray(metadata) ? metadata : Object.values(metadata);
  } catch {
    fail("npm returned unreadable token metadata");
  }

  const matchingTokens = matchingConfiguredTokens(tokens, configuredToken);
  if (matchingTokens.length === 0) {
    fail("npm did not return metadata for the configured release credential");
  }
  if (matchingTokens.length > 1) {
    fail("npm returned ambiguous metadata for the configured release credential");
  }
  const token = uniquelyConfiguredToken(tokens, configuredToken);

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
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
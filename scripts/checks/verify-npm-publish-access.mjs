/**
 * Verify that a GitHub Actions release run can use npm trusted publishing and
 * that every publishable package agrees on the canonical npm namespace.
 *
 * npm performs the OIDC exchange during `npm publish`, so this guard verifies
 * the CI prerequisites without trying to enumerate or log any credentials.
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_SCOPE = "@third-eye-cyborg";
const MINIMUM_NODE_VERSION = [22, 14, 0];
const MINIMUM_NPM_VERSION = [11, 5, 1];
const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const packagesDir = join(rootDir, "packages");

function fail(message) {
  console.error(`npm publish preflight failed: ${message}`);
  process.exit(1);
}

export function parseVersion(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version ?? "");
  return match ? match.slice(1).map(Number) : null;
}

export function isAtLeastVersion(actual, minimum) {
  if (!actual) return false;
  for (let index = 0; index < minimum.length; index += 1) {
    const part = actual[index] ?? 0;
    const minimumPart = minimum[index] ?? 0;
    if (part > minimumPart) return true;
    if (part < minimumPart) return false;
  }
  return true;
}

export function hasGitHubActionsOidcEnvironment(environment) {
  return Boolean(
    environment.GITHUB_ACTIONS === "true" &&
    environment.ACTIONS_ID_TOKEN_REQUEST_URL &&
    environment.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
  );
}

export function isPublicPackageManifest(manifest) {
  return (
    manifest.private !== true &&
    typeof manifest.name === "string" &&
    manifest.name.startsWith(`${EXPECTED_SCOPE}/`) &&
    manifest.publishConfig?.access === "public"
  );
}

function main() {
  if (process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN) {
    fail("npm tokens must not be configured; trusted publishing uses GitHub OIDC");
  }
  if (!hasGitHubActionsOidcEnvironment(process.env)) {
    fail("GitHub Actions OIDC is unavailable; require id-token: write");
  }
  if (!isAtLeastVersion(parseVersion(process.versions.node), MINIMUM_NODE_VERSION)) {
    fail(`Node ${MINIMUM_NODE_VERSION.join(".")} or newer is required for trusted publishing`);
  }
  const npmVersion = execFileSync("npm", ["--version"], {
    encoding: "utf8",
  }).trim();
  if (!isAtLeastVersion(parseVersion(npmVersion), MINIMUM_NPM_VERSION)) {
    fail(`npm ${MINIMUM_NPM_VERSION.join(".")} or newer is required for trusted publishing`);
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
    `npm trusted-publishing preflight passed for ${publicPackages.length} public packages in ${EXPECTED_SCOPE}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

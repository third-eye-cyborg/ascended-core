#!/usr/bin/env bash
# TEMPORARY npm release fallback while GitHub Actions is locked.
#
# Publishes every packages/* package with an npm automation token read from
# the Buildkite cluster secret NPM_TOKEN. This deliberately does NOT run
# scripts/checks/verify-npm-publish-access.mjs (which rejects tokens because
# the normal release uses GitHub OIDC trusted publishing) and does NOT pass
# --provenance: releases published this way have no npm provenance.
# Remove this script once .github/workflows/release.yml can run again.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

source .buildkite/scripts/setup-pnpm.sh
source .buildkite/scripts/release-guard.sh

echo "--- :lock: Release guard"
release_guard

echo "--- :pnpm: Install dependencies"
pnpm install --frozen-lockfile

echo "--- :package: Build"
pnpm build

echo "--- :package: Package smoke"
node scripts/checks/package-smoke.mjs

echo "--- :key: npm auth (temporary npmrc)"
NPM_TOKEN="$(buildkite-agent secret get NPM_TOKEN)"
if [[ -z "${NPM_TOKEN}" ]]; then
  echo "Cluster secret NPM_TOKEN is empty or unavailable." >&2
  exit 1
fi
export NPM_TOKEN
# Redact the token from the job log if anything ever echoes it.
buildkite-agent redactor add <<<"${NPM_TOKEN}" >/dev/null 2>&1 || true

NPMRC="$(mktemp)"
cleanup() {
  rm -f "${NPMRC}"
  unset NPM_TOKEN NPM_CONFIG_USERCONFIG npm_config_userconfig
}
trap cleanup EXIT
# The npmrc references the environment variable; the token value itself is
# never written to disk.
printf '%s\n' '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > "${NPMRC}"
chmod 600 "${NPMRC}"
export NPM_CONFIG_USERCONFIG="${NPMRC}"
export npm_config_userconfig="${NPMRC}"

echo "npm user: $(npm whoami)"

# Never wait for an interactive browser (web) 2FA login: with legacy auth
# type and no TTY, npm fails fast with EOTP if the token cannot bypass 2FA
# instead of polling /-/v1/done until it times out.
export CI=true
export npm_config_auth_type=legacy

echo "--- :npm: Publish ${RELEASE_VERSION} (no provenance)"
pnpm --filter "./packages/*" -r publish --access public --no-git-checks

echo "--- :npm: Verify"
for manifest in packages/*/package.json; do
  name="$(node -p "require('./${manifest}').name")"
  # The registry can take a moment to show a new version; don't fail on that.
  published="$(npm view "${name}@${RELEASE_VERSION}" version 2>/dev/null || true)"
  echo "${name}@${published:-<not visible yet>}"
done

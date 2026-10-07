#!/usr/bin/env bash
# Temporary npm release fallback: release guard plus the pre-publish checks.
# Uses no secrets.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

source .buildkite/scripts/setup-pnpm.sh
source .buildkite/scripts/release-guard.sh

echo "--- :lock: Release guard"
release_guard

echo "--- :pnpm: Install dependencies"
pnpm install --frozen-lockfile

echo "--- :eslint: Lint"
pnpm lint

echo "--- :typescript: Typecheck"
pnpm typecheck

echo "--- :vitest: Test"
pnpm test

echo "--- :package: Build"
pnpm build

echo "--- :package: Package smoke (CJS/ESM load, tarball install, LICENSE)"
node scripts/checks/package-smoke.mjs

echo "--- :mag: Boundary scan"
node scripts/checks/boundary-scan.mjs

echo "--- :scales: Third-party license and provenance check"
pnpm check:third-party

echo "--- :lock: Production dependency audit"
pnpm audit:production

echo "--- :npm: Publish dry run"
pnpm --filter "./packages/*" -r publish --access public --no-git-checks --dry-run

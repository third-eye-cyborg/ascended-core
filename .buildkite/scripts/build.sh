#!/usr/bin/env bash
# Temporary backup CI: mirrors the "Lint, typecheck, test & build" job in
# .github/workflows/ci.yml.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

source .buildkite/scripts/setup-pnpm.sh

echo "--- :pnpm: Install dependencies"
pnpm install --frozen-lockfile

echo "--- :lock: Production dependency audit"
pnpm audit:production

echo "--- :eslint: Lint"
pnpm lint

echo "--- :typescript: Typecheck"
pnpm typecheck

echo "--- :vitest: Test"
pnpm test

echo "--- :package: Build"
pnpm build

echo "--- :mag: Boundary scan"
# Lists every binary-skipped file, as in the Actions workflow.
BOUNDARY_SCAN_VERBOSE=1 node scripts/checks/boundary-scan.mjs

echo "--- :package: Package smoke (CJS/ESM load + LICENSE in tarballs)"
node scripts/checks/package-smoke.mjs

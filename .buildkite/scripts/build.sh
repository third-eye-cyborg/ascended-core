#!/usr/bin/env bash
# Temporary backup CI: mirrors the quality job in .github/workflows/ci.yml
# (lint, typecheck, test, build, pack-smoke). Needs Node >= 22.12.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

source .buildkite/scripts/setup-pnpm.sh

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

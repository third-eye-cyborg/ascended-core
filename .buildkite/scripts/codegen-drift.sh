#!/usr/bin/env bash
# Temporary backup CI: mirrors .github/workflows/codegen-drift.yml.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

source .buildkite/scripts/setup-pnpm.sh

echo "--- :pnpm: Install dependencies"
pnpm install --frozen-lockfile

echo "--- :package: Build api-contracts"
pnpm --filter @third-eye-cyborg/api-contracts build

echo "--- :triangular_ruler: Run drift test"
pnpm --filter @third-eye-cyborg/api-contracts test

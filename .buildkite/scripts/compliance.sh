#!/usr/bin/env bash
# Temporary backup CI: mirrors the license, provenance, SBOM and ScanCode
# steps in .github/workflows/ci.yml.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

source .buildkite/scripts/setup-pnpm.sh

echo "--- :python: Python 3.11 for ScanCode"
# node:22-bookworm ships Python 3.11; make sure venv/dev headers are present.
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 python3-venv python3-dev >/dev/null
python3 --version

echo "--- :pnpm: Install dependencies"
pnpm install --frozen-lockfile

echo "--- :scales: Third-party license and provenance check"
pnpm check:third-party

echo "--- :page_facing_up: Generate production SPDX SBOM"
node scripts/checks/third-party-compliance.mjs --sbom > sbom.spdx.json

echo "--- :hammer_and_wrench: Install ScanCode Toolkit"
SCANCODE_PYTHON="$(command -v python3.11 || command -v python3)" bash scripts/checks/install-scancode.sh

echo "--- :mag: Scan licenses and copyrights"
pnpm check:scancode

echo "--- :link: Third-party supply-chain check"
node scripts/checks/third-party-compliance.mjs --skip-network

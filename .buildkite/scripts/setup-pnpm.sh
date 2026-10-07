#!/usr/bin/env bash
# Temporary backup CI helper (sourced by the other scripts): install the pnpm
# version pinned in package.json (packageManager), matching the GitHub Actions
# "Setup pnpm" step.

echo "--- :nodejs: Toolchain"
# The checkout is bind-mounted into the container and owned by another uid.
git config --global --add safe.directory '*'
node --version
PNPM_VERSION="$(node -p "require('./package.json').packageManager.replace(/^pnpm@/, '')")"
npm install --global "pnpm@${PNPM_VERSION}" >/dev/null
pnpm --version

# Keep the pnpm store outside the checkout. Inside the container pnpm would
# otherwise create ./.pnpm-store, which the boundary scan and ScanCode would
# then scan.
export npm_config_store_dir="/tmp/pnpm-store"

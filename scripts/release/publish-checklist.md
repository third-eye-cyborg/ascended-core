# Release / publish checklist

Work through this checklist before tagging a release. Only maintainers cut
releases and publish to npm.

## Pre-release

- [ ] **Green CI** on `main` — typecheck, lint, test, and build all passing.
- [ ] **Boundary scan** passes locally and in CI:
      `node scripts/checks/boundary-scan.mjs` exits 0.
- [ ] **Version bumps** are consistent across affected packages
      (use `node scripts/release/version.mjs <package-dir> <semver>`).
- [ ] **CHANGELOG.md** updated with a dated entry for the new version.
- [ ] **License confirmed** — `LICENSE` present and © Third Eye Cyborg LLC.
- [ ] **npm scope ownership verified** — the `@ascended` scope on npm is owned
      by the org and the publishing token has publish rights.
- [ ] Docs reviewed for accuracy (README, migration-and-adoption, examples).
- [ ] `pnpm --filter @ascended/example-minimal-server smoke` passes.

## Tag & publish

- [ ] Create and push a `v*` tag (for example `v0.1.0`).
- [ ] Release workflow builds, tests, and publishes each public package with
      `--provenance`.
- [ ] GitHub Release created with notes derived from the changelog.

## Post-release

- [ ] Verify published packages install and import cleanly from npm.
- [ ] Announce in Discussions if appropriate.

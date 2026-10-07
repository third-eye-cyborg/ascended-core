# Continuous integration

## Primary CI: GitHub Actions

The workflows in [`.github/workflows/`](../.github/workflows/) are the source of
truth for CI, releases, and publishing.

## Temporary backup CI: Buildkite

> **Temporary.** GitHub Actions is currently unavailable for this repository
> (every job fails at startup because of an account-level billing lock, not a
> code problem). While that lasts, a Buildkite pipeline runs the same checks as
> backup CI. Remove `.buildkite/` and this section once Actions runs again.

[`.buildkite/pipeline.yml`](../.buildkite/pipeline.yml) mirrors
[`ci.yml`](../.github/workflows/ci.yml) and, when `packages/api-contracts/`
changes, [`codegen-drift.yml`](../.github/workflows/codegen-drift.yml):

- install with `pnpm install --frozen-lockfile` on Node 22 and the pnpm version
  pinned in `package.json`
- production dependency audit, lint, typecheck, test, build
- boundary scan and package smoke
- third-party license/provenance check, SPDX SBOM, ScanCode license and
  copyright scan

Not covered by the backup pipeline:

- the PR title check (`pr-title.yml`); please keep using Conventional Commit
  titles
- releases and npm publishing (`release.yml`), which stay on Actions only
- CodeQL code scanning, which only runs on GitHub

The backup pipeline uses no secrets, and it does not build pull requests from
forks. Maintainers can run a fork PR's checks by hand after reviewing it.

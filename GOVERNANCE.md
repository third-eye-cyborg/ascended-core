# Governance

This document describes how the Ascended Core project is governed: the roles
people hold, how decisions are made, and how to become a maintainer.

## Roles

### Contributors

Anyone who opens an issue, participates in discussion, or submits a pull
request is a contributor. Contributors are expected to follow the
[Code of Conduct](./CODE_OF_CONDUCT.md) and the boundary rules in
[CONTRIBUTING.md](./CONTRIBUTING.md).

### Maintainers

Maintainers (the `@third-eye-cyborg/core-maintainers` team) are responsible for
the health of the project. They review and merge pull requests, triage issues,
cut releases, and safeguard the project's boundaries. Maintainers are listed as
code owners in [CODEOWNERS](./.github/CODEOWNERS).

### Lead maintainers

One or more lead maintainers act as tie-breakers and are ultimately accountable
for the direction of the project and for security response coordination.

## Review requirements

Reviews are driven by [CODEOWNERS](./.github/CODEOWNERS):

- Every pull request requires at least one approving review from a maintainer.
- Changes to protected paths — `packages/api-contracts/`, `packages/providers/`,
  `.github/workflows/`, any package's `package.json`, `GOVERNANCE.md`,
  `SECURITY.md`, and `LICENSE` — require approval from the code owners
  (`@third-eye-cyborg/core-maintainers`).
- CI (typecheck, lint, test, build) and the boundary scan must pass before merge.

## Decision process

We operate by **lazy consensus**:

- Most changes proceed once they have at least one maintainer approval and no
  unresolved objections from other maintainers within a reasonable review
  window.
- Substantial or controversial changes should be raised as a GitHub Discussion
  or issue first, so the community and maintainers can weigh in.
- **Maintainer veto on boundary/security:** any maintainer may block a change
  that violates the project's boundary rules (vendor neutrality, synthetic-data
  only, no secrets/production internals) or that raises an unresolved security
  concern. Such a veto stands until the concern is resolved.
- If consensus cannot be reached, the lead maintainer(s) make the final
  decision.

## Releases

Releases follow [docs/release-process](./docs/release-process) and the
[publish checklist](./scripts/release/publish-checklist.md). Only maintainers
cut releases and publish to npm.

## Becoming a maintainer

Maintainership is earned through sustained, high-quality contribution and good
judgment about the project's boundaries. The typical path:

1. Make consistent, meaningful contributions (code, reviews, docs, triage).
2. Demonstrate understanding of and respect for the vendor-neutral,
   synthetic-data-only boundaries.
3. Be nominated by an existing maintainer.
4. Gain lazy-consensus approval from the current maintainers.

New maintainers are added to the `@third-eye-cyborg/core-maintainers` team.
Maintainers who become inactive for an extended period may be moved to emeritus
status; this is not a reflection on their past contributions.

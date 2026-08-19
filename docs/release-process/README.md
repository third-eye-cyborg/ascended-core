# Release Process

Ascended Core publishes small, independently useful packages under the
`@third-eye-cyborg/*` scope. Releases are **tag-driven**, versioned with semver, and
consumed downstream via explicit versions (see
[adoption model](../architecture/adoption-model.md)).

All packages currently sit at **`0.1.0`** — the pre-1.0 (`0.x`) line.

## npm namespace and publish access

The canonical npm namespace is **`@third-eye-cyborg`** (including both
hyphens). The former `@ascended` package names are not release targets.

GitHub Actions publishes with the `NPM_TOKEN` repository secret. That credential
must authenticate as the `thirdeyecyborg` npm maintainer and grant package-write
access to `@third-eye-cyborg`, with automation/2FA bypass enabled. Before either
a dry-run or tagged release, `pnpm check:npm-publish-access` verifies the npm
identity and token metadata, then confirms every public package manifest uses
the canonical scope and `publishConfig.access = "public"`.

## Semantic versioning policy

We follow [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

- **PATCH** (`0.1.0` → `0.1.1`) — backward-compatible bug fixes and docs.
- **MINOR** (`0.1.0` → `0.2.0`) — new backward-compatible surface; **in the
  `0.x` line a minor bump may also carry breaking changes** (see below).
- **MAJOR** (`0.x` → `1.0.0`) — the API is declared stable.

### 0.x compatibility expectations

While Core is `0.x`:

- The public surface is **still stabilizing**. Under semver, a `0.MINOR` bump
  (e.g. `0.1.x` → `0.2.0`) is where breaking changes are allowed.
- **Patch releases stay compatible.** Never ship a breaking change in a patch.
- Breaking changes are **documented in the changelog** with a migration note.
- Downstream products should pin exact versions and adopt new minors
  deliberately, qualifying each upgrade.

## Changelog

Every package maintains a changelog following
[Keep a Changelog](https://keepachangelog.com) conventions:

- Group entries under **Added / Changed / Deprecated / Removed / Fixed /
  Security**.
- Each release entry records its version and date.
- Breaking changes are called out explicitly with a short migration note.
- Changelog updates land **in the same PR** as the change they describe.

## Tag-driven publishing with provenance

Publishing is triggered by pushing a version **git tag**; CI does the release —
maintainers never publish by hand from a laptop.

A manual workflow dispatch performs the same validation and package publish
command with `--dry-run`; it never uploads a package or creates a GitHub
Release.

1. Bump versions and update changelogs in a release PR.
2. Merge to the default branch.
3. Push an annotated tag for the release (for example `v0.2.0`).
4. CI builds, tests, and publishes the affected `@third-eye-cyborg/*` packages to the
   registry **with npm provenance** enabled, so each artifact is cryptographically
   linked to the source commit and CI workflow that produced it.

Provenance gives consumers a verifiable supply-chain trail from published
package back to public source — reinforcing the one-way
public → release → private-adoption flow.

## Who may release

Releases are gated by **CODEOWNERS**. Only maintainers listed as owners may:

- approve a release PR, and
- push release tags.

CODEOWNERS also governs review of the areas each maintainer owns (contracts,
events, privacy, providers, docs, and so on), so no release ships without the
relevant owner's sign-off.

## Support policy

Because Core is `0.x`, support is intentionally narrow:

- **Supported:** the **latest minor of the `0.x` line**. Fixes (including
  security fixes) land there and ship as patch releases.
- **Not supported:** older `0.x` minors do not receive back-ports. Downstream
  consumers stay current by adopting the latest minor.
- The support window will be revisited when Core reaches `1.0.0`.

Security issues should be reported privately to the maintainers rather than
opened as public issues; fixes are released as promptly as possible on the
supported minor.

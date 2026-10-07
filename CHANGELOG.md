# Changelog

All notable changes to Ascended Core are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-06

Minor release covering everything merged since 0.1.1 (#30, #28, #26, #34,
#33, #27, #31). In the `0.x` line a minor may carry breaking changes; this
one does, because the exported schemas move to Zod 4 (see below).

### Changed

- **BREAKING:** `@third-eye-cyborg/events`, `@third-eye-cyborg/api-contracts`,
  and `@third-eye-cyborg/sdk` now depend on Zod 4 (`zod` 3.25.76 → 4.6.5) and
  export Zod 4 schemas. Consumers that compose these schemas, or that declare
  a Zod peer, must use Zod 4. Zod 4 also changes issue codes and messages
  exposed on the SDK's `ApiError` via `result.error.issues`. The zod license
  notice is unchanged.
- Dev and CI now require Node >= 22.12 (vitest 5). Published package
  `engines.node` remains `>=20`.
- Docs: contributions now require a Developer Certificate of Origin sign-off
  (`git commit -s`); see CONTRIBUTING.md.
- Docs: added TRADEMARKS.md and a root NOTICE file; copyright and `author`
  metadata now use the legal name "Third Eye Cyborg, LLC".
- Docs: SECURITY.md points reporters to GitHub private vulnerability reporting,
  adds a good-faith security research statement, and no longer describes the
  repository as private.
- Third-party notices for zod now match the copyright year and author from
  zod's MIT license.
- Public packages now include a NOTICE file.
- `@third-eye-cyborg/api-contracts` no longer bundles the `yaml` package into
  `dist`; `yaml` (ISC) is now an optional peer dependency used by the drift
  check, which falls back to a regex check when `yaml` is not installed.
- Docs: README and API docs use the published `@third-eye-cyborg/*` package
  names and the real `AscendedCoreClient` SDK surface, describe the reference
  server as a local demo, state that Ascended Core alone is not a complete,
  deployable Ascended Social, and mark federation as planned but not
  implemented. Added a compliance and warranty note; `funding.md` now says no
  collective exists yet.
- CI: the quality job runs install, lint, typecheck, test, build, and
  pack-smoke on Node 22.12 and the latest Node 22; pack-smoke installs
  `pnpm pack` tarballs into a fresh project and loads ESM, CJS, and types.
  Dependabot ignores uncoordinated majors for TypeScript, ESLint, Zod,
  Vitest, and `@types/node`.
- CI: added a temporary Buildkite backup pipeline (`.buildkite/`, see
  `docs/ci.md`) that mirrors the Actions checks while GitHub Actions is
  unavailable. It uses no secrets, does not publish, and does not build fork
  pull requests.
- Public package manifests now declare `engines.node >= 20`,
  `sideEffects: false`, and `keywords`. Removed the root `codegen:api` and
  `codegen:sdk` scripts, which pointed at scripts that do not exist.

### Fixed

- `@third-eye-cyborg/ai-router`: provider timeouts are recorded as
  `PROVIDER_TIMEOUT`.
- `@third-eye-cyborg/sdk`: maps additional HTTP statuses to typed errors.
- Reference server: notification pagination is honored, join/RSVP are
  idempotent, and demo auth only accepts valid entity ids.
- Build: workspace packages are kept external after the scope rename.
- ScanCode copyright-holder gate: the Unreleased changelog no longer quotes
  the zod MIT copyright notice, which ScanCode treated as an unexpected
  third-party copyright holder in `CHANGELOG.md`.
- The OpenAPI spec `info.version` and the reference server's default
  reported version now read `0.2.0` instead of `0.1.1`.
- Release workflow: both jobs run Node 22.14, the minimum the npm
  trusted-publishing preflight requires (Node 22.12 failed it).

### Security

- `@third-eye-cyborg/privacy`: Human mode now ignores `allowedCloudProviders`.
  In 0.1.0–0.1.1 an allow-listed provider could be called while Human mode
  was active, bypassing Human mode's family blocks.

### Dependencies

- Dev tooling: TypeScript 5.9.3 → 6.0.3, vitest 3.2.7 → 5.0.3, eslint 9.39.5 →
  10.12.0, typescript-eslint 8.67.0 → 8.71.1, `@types/node` 22.20.1 → 22.20.5
  (`^22`, matching Node 22 / vitest 5), tsup 8.5.1, tsx 4.23.15,
  prettier 3.9.9, yaml 2.9.1, orval 8.40.0.
  TypeScript 7.0.2 was not adopted: typescript-eslint supports
  `typescript <6.1.0` and the native TS 7 package does not provide the
  compiler API that the tsup declaration build and typescript-eslint need.
- CI: `actions/upload-artifact` pinned to v7.0.1
  (`043fb46d1a93c77aae656e7c1c64a875d1fc6a0a`), matching `release.yml`.

## [0.1.1] - 2026-08-20

### Fixed

- Hardened the npm publish credential preflight to accept valid shortened
  token metadata returned by current npm CLI versions while rejecting ambiguous
  or generic display prefixes.

### Changed

- Added automated coverage for exact, masked, shortened, malformed, and
  ambiguous npm token metadata before release publication.

## [0.1.0] - 2026-08-14

Initial public release of the Ascended Core monorepo.

### Added

- `@third-eye-cyborg/core` — shared foundation: opaque prefixed ids, result/error
  helpers, lifecycle, time, and metadata extension points.
- `@third-eye-cyborg/contracts` — platform-neutral domain contract types and guards
  (identity, content, communities, conversations, events, moderation surfaces).
- `@third-eye-cyborg/events` — typed, versioned domain events with a bus contract,
  idempotency, retry/dead-letter interfaces, and an in-memory test harness.
- `@third-eye-cyborg/privacy` — privacy modes (cloud / private-local / human-only),
  declarative policy enforcement, data minimization, and redaction-safe
  telemetry.
- `@third-eye-cyborg/ai-router` — provider registry, capability routing, privacy-aware
  fallbacks, and routing telemetry.
- `@third-eye-cyborg/providers` — vendor-neutral provider ports (auth, authorization,
  object storage, email, push) with generic in-memory adapters.
- `@third-eye-cyborg/persistence` — repository ports with in-memory reference
  implementations.
- `@third-eye-cyborg/observability` — logging, metrics, and tracing contracts.
- `@third-eye-cyborg/realtime` — presence and room contracts.
- `@third-eye-cyborg/media` — media pipeline contracts and adapters.
- `@third-eye-cyborg/notifications` — multi-channel notification contracts.
- `@third-eye-cyborg/api-contracts` — reference HTTP API schema contracts.
- `@third-eye-cyborg/sdk` — typed client SDK.
- Reference examples: `example-minimal-server`, `openapi-client`, and
  `reference-adapters`.

[Unreleased]: https://github.com/third-eye-cyborg/ascended-core/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/third-eye-cyborg/ascended-core/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/third-eye-cyborg/ascended-core/releases/tag/v0.1.1
[0.1.0]: https://github.com/third-eye-cyborg/ascended-core/releases/tag/v0.1.0

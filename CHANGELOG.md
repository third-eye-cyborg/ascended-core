# Changelog

All notable changes to Ascended Core are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/third-eye-cyborg/ascended-core/releases/tag/v0.1.0

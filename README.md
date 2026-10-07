# Ascended Core

[![CI](https://github.com/third-eye-cyborg/ascended-core/actions/workflows/ci.yml/badge.svg)](https://github.com/third-eye-cyborg/ascended-core/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@third-eye-cyborg/core.svg)](https://www.npmjs.com/package/@third-eye-cyborg/core)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](./package.json)

**Ascended Core** is open-source TypeScript infrastructure for privacy-conscious
community applications. It provides platform-neutral domain contracts, privacy
modes, AI routing, an event backbone, vendor-neutral provider ports, and
in-memory reference adapters.

Ascended Core is vendor-agnostic. It does not hard-code a cloud identity
provider, an object-storage provider, an AI provider, or product vocabulary.
Domain-specific concepts live in metadata extension points, not in Core.

This repository publishes libraries. It does not ship a production host
process. Federation between independently hosted nodes is planned for the
future. It is not implemented in any current release, and no date is committed.

## Packages

Install only the public packages your application needs from the
`@third-eye-cyborg` npm scope. Canonical names are `@third-eye-cyborg/core`,
`@third-eye-cyborg/contracts`, and so on — there are no
`@third-eye-cyborg/ascended-*` packages.

```sh
pnpm add @third-eye-cyborg/core
```

| Package | Install command | Purpose |
| --- | --- | --- |
| `@third-eye-cyborg/core` | `pnpm add @third-eye-cyborg/core` | Shared IDs, errors, results, lifecycle, and health primitives. |
| `@third-eye-cyborg/contracts` | `pnpm add @third-eye-cyborg/contracts` | Platform-neutral domain contracts and guards. |
| `@third-eye-cyborg/events` | `pnpm add @third-eye-cyborg/events` | Typed domain events and event-bus contracts. |
| `@third-eye-cyborg/privacy` | `pnpm add @third-eye-cyborg/privacy` | Privacy modes, enforcement hooks, and minimization helpers. |
| `@third-eye-cyborg/ai-router` | `pnpm add @third-eye-cyborg/ai-router` | Provider registry and privacy-aware AI routing. |
| `@third-eye-cyborg/providers` | `pnpm add @third-eye-cyborg/providers` | Vendor-neutral provider ports and in-memory adapters. |
| `@third-eye-cyborg/persistence` | `pnpm add @third-eye-cyborg/persistence` | Repository and transaction contracts. |
| `@third-eye-cyborg/realtime` | `pnpm add @third-eye-cyborg/realtime` | Presence, room, pub/sub, and call-session abstractions. |
| `@third-eye-cyborg/media` | `pnpm add @third-eye-cyborg/media` | Media upload, lifecycle, and transformation contracts. |
| `@third-eye-cyborg/notifications` | `pnpm add @third-eye-cyborg/notifications` | Notification preferences and delivery contracts. |
| `@third-eye-cyborg/observability` | `pnpm add @third-eye-cyborg/observability` | Logging, tracing, metrics, and health aggregation. |
| `@third-eye-cyborg/api-contracts` | `pnpm add @third-eye-cyborg/api-contracts` | Public OpenAPI contracts and Zod validation types. |
| `@third-eye-cyborg/sdk` | `pnpm add @third-eye-cyborg/sdk` | Typed TypeScript client for the reference API. |

Use the same package names with `npm install` or `yarn add`. Guides live in
[`docs/`](./docs).

## Quickstart

```ts
import { createId, ok, err, isEntityId } from "@third-eye-cyborg/core";

const accountId = createId("acct");
const postId = createId("post");

console.log(isEntityId(accountId)); // true

function loadProfile(id: string) {
  if (!isEntityId(id)) {
    return err({ code: "invalid_id", message: `Not an entity id: ${id}` });
  }
  return ok({ id, displayName: "Ada Example" });
}

const result = loadProfile(accountId);
if (result.ok) {
  console.log(result.value.displayName); // "Ada Example"
}
```

`ok` / `err` follow the exports of `@third-eye-cyborg/core`. See
`packages/core/src/index.ts` for the public surface.

## Reference server (local demo only)

A runnable in-memory server demonstrates profiles, posts, communities, events,
and notifications:

```sh
pnpm install
pnpm --filter @third-eye-cyborg/example-minimal-server smoke
```

To leave it running:

```sh
pnpm --filter @third-eye-cyborg/example-minimal-server start
```

This example binds to `127.0.0.1`, stores state in memory, and accepts demo
bearer tokens of the form `test-<entityId>` (for example
`test-acct_…` from `createId("acct")`). It is not a production host and is not
a federated node.

## Self-hosting

There is no production "Ascended Core Node" binary in this repository. Self-hosters
consume the published `@third-eye-cyborg/*` packages and provide their own
adapters (auth, storage, delivery). The in-tree reference server is a local
demo only. Ascended Core alone is not a complete, deployable Ascended Social.
Running it in production requires your own adapters, hosting, security, and
operations.

Federation — independently hosted nodes exchanging identity, content, or
activity — is planned for the future. Ascended Core does not provide it today.

## Compliance and warranty

Ascended Core provides interfaces and policy hooks that can help you build
privacy features. Using Ascended Core does not by itself make an application
compliant with any law, regulation, or standard (for example GDPR, CCPA,
COPPA, or HIPAA). You are responsible for how your application collects, uses,
and protects data. Ascended Core is provided "AS IS", without warranties or
conditions of any kind, as stated in Sections 7 and 8 of the Apache License 2.0.

## Repo layout

```
ascended-core/
├── packages/
│   ├── core/            # shared foundation: ids, results, errors, lifecycle
│   ├── contracts/       # platform-neutral domain contract types + guards
│   ├── events/          # typed, versioned domain events + bus contract
│   ├── privacy/         # privacy modes, policy enforcement, minimization
│   ├── ai-router/       # provider registry + capability routing
│   ├── providers/       # vendor-neutral provider ports + in-memory adapters
│   ├── persistence/     # repository ports + in-memory reference impls
│   ├── observability/   # logging / metrics / tracing contracts
│   ├── realtime/        # presence + room contracts
│   ├── media/           # media pipeline contracts + adapters
│   ├── notifications/   # multi-channel notification contracts
│   ├── api-contracts/   # reference HTTP API schema contracts
│   └── sdk/             # typed client SDK
├── examples/
│   ├── minimal-server/    # runnable reference server (smoke-testable)
│   ├── openapi-client/    # generated client example
│   └── reference-adapters/# example provider adapters
├── docs/                  # architecture, domain model, guides
├── scripts/               # checks + release tooling
└── .github/               # CI, templates, policies
```

## Versioning & downstream adoption

Ascended Core follows semantic versioning. Downstream products pin an engine
version and opt into features gradually. See
[docs/migration-and-adoption](./docs/migration-and-adoption) and the example
adoption manifest [`core-adoption.example.yaml`](./core-adoption.example.yaml).

Ascended Social is a separate, proprietary hosted product from Third Eye Cyborg, LLC that uses Ascended Core. It is not open source and is not part of this repository. "Ascended Core" and "Ascended Social" are trademarks of Third Eye Cyborg, LLC; see [TRADEMARKS.md](./TRADEMARKS.md).

## Contributing, security & license

- [Contributing guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Governance](./GOVERNANCE.md)
- [Support](./SUPPORT.md)
- [Security policy](./SECURITY.md)
- [Trademarks](./TRADEMARKS.md)
- Licensed under the [Apache License 2.0](./LICENSE). Copyright 2026 Third Eye Cyborg, LLC. See [NOTICE](./NOTICE).

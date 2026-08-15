# Ascended Core

<!-- Badge placeholders — wire these up once CI and npm publishing are live. -->
[![CI](https://img.shields.io/badge/CI-pending-lightgrey.svg)](./.github/workflows/ci.yml)
[![npm](https://img.shields.io/badge/npm-%40ascended%2Fcore-lightgrey.svg)](https://www.npmjs.com/package/@ascended/core)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](./package.json)

**Ascended Core** is open-source infrastructure for privacy-conscious spiritual
and community applications. It provides platform-neutral domain contracts,
privacy modes, AI routing, an event backbone, vendor-neutral provider ports,
and reference adapters — everything a community product needs to build on a
solid, testable foundation without coupling to any specific vendor.

Ascended Core is intentionally vendor-agnostic. It never hard-codes a cloud
identity provider, an object-storage provider, an AI provider, or product
vocabulary. Domain-specific concepts (such as chakras, elements, or sigils in a
downstream product) live in metadata extension points, not in Core.

## Features

- **Domain contracts** (`@ascended/contracts`) — platform-neutral types and
  guards for identity, content, communities, conversations, events, and
  moderation surfaces.
- **Privacy modes** (`@ascended/privacy`) — cloud / private-local / human-only
  modes, declarative policy enforcement, data minimization, and
  redaction-safe telemetry.
- **AI routing** (`@ascended/ai-router`) — a provider registry with capability
  routing, privacy-aware fallbacks, and routing telemetry for text, image, 3D,
  and recommendation workloads.
- **Events** (`@ascended/events`) — typed, versioned domain events with an
  event-bus contract, idempotency, retry/dead-letter interfaces, and an
  in-memory test harness.
- **Provider ports** (`@ascended/providers`) — vendor-neutral port interfaces
  (auth, authorization, object storage, email, push) plus generic in-memory
  adapters for tests and examples.
- **Realtime, media, notifications** (`@ascended/realtime`, `@ascended/media`,
  `@ascended/notifications`) — contracts and adapters for presence/rooms,
  media pipelines, and multi-channel notification delivery.
- **Observability** (`@ascended/observability`) — logging, metrics, and tracing
  contracts designed to stay redaction-safe.
- **Persistence** (`@ascended/persistence`) — repository port interfaces with
  in-memory reference implementations.
- **Reference API + SDK** (`@ascended/api-contracts`, `@ascended/sdk`) — schema
  contracts for the reference HTTP API and a typed client SDK.

## Install

```sh
pnpm add @ascended/core
```

Add any additional packages you need, for example:

```sh
pnpm add @ascended/contracts @ascended/privacy @ascended/events
```

## Quickstart

```ts
import { createId, ok, err, isEntityId } from "@ascended/core";

// Opaque, prefixed, vendor-neutral entity ids.
const accountId = createId("acct");
const postId = createId("post");

console.log(isEntityId(accountId)); // true

// Result helpers keep error handling explicit and type-safe.
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

> `ok`/`err` shapes follow the exports of `@ascended/core`. Read
> `packages/core/src/index.ts` for the authoritative surface.

## Run the reference server

A runnable reference server demonstrates profiles, posts, communities, events,
and notifications on local in-memory adapters:

```sh
pnpm --filter @ascended/example-minimal-server smoke
```

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
adoption manifest [`core-adoption.example.yaml`](./core-adoption.example.yaml)
for how a downstream product (for example, the private **Ascended Social**
product) consumes Core versions and adopts features over time.

## Contributing, security & license

- [Contributing guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Governance](./GOVERNANCE.md)
- [Support](./SUPPORT.md)
- [Security policy](./SECURITY.md)
- Licensed under the [Apache License 2.0](./LICENSE) — © Third Eye Cyborg LLC.

# Architecture Overview

Ascended Core is a pnpm monorepo of small, independently versioned packages.
Each package is either a **contract** (pure types + light runtime validators),
a **port** (vendor-neutral interface) with an **in-memory adapter**, or a
**composition** package that wires ports together behind a privacy-aware policy.

## Package map (13 packages)

| Package | Role | Summary |
| --- | --- | --- |
| `@third-eye-cyborg/ascended-core` | Foundation | `EntityId`/`createId`, `Result`, `CoreError`/`ErrorCode`, ISO time helpers, `HealthState`/health contracts, lifecycle, and `Metadata`/`Extensible` extension points. |
| `@third-eye-cyborg/ascended-contracts` | Domain contracts | Platform-neutral types + type guards across nine bounded contexts (identity, content, community, conversation, events, realtime, avatar, search, audit). No I/O. |
| `@third-eye-cyborg/ascended-events` | Event system | Versioned `DomainEvent` envelope, the 10-type event catalog, `EventBus` contract, delivery/dead-letter policy, `InMemoryEventBus`, and `createEventHarness`. |
| `@third-eye-cyborg/ascended-privacy` | Privacy | `PrivacyMode` (cloud / private-local / human), `PrivacyPolicy`, `PrivacyPolicyEnforcer`, request context, and redaction-safe telemetry. |
| `@third-eye-cyborg/ascended-ai-router` | AI routing | Provider registry, capability descriptors, privacy-aware fallback routing for text/image/3D/recommendation, and synthetic stub providers. |
| `@third-eye-cyborg/ascended-providers` | Provider ports | Vendor-neutral ports for auth, authorization, storage, email, push, billing, rate-limit, search, and audit, each with an in-memory adapter. |
| `@third-eye-cyborg/ascended-persistence` | Persistence ports | `Repository`, `UnitOfWork`, migration contracts, and in-memory implementations. No SQL or production schema. |
| `@third-eye-cyborg/ascended-observability` | Observability | Request scope, redaction-safe logging, metrics, tracing, and health aggregation with in-memory collectors. |
| `@third-eye-cyborg/ascended-realtime` | Realtime | Rooms, presence, pub/sub, call/session, and webhook delivery with local adapters. |
| `@third-eye-cyborg/ascended-media` | Media | Upload sessions, asset lifecycle, and transform contracts with a local object-storage adapter. |
| `@third-eye-cyborg/ascended-notifications` | Notifications | Preferences, multi-channel (in-app/email/push) workflow contracts, and local adapters. |
| `@third-eye-cyborg/ascended-api-contracts` | API surface | Transport-level request/response contracts and the API spec that the SDK targets. |
| `@third-eye-cyborg/ascended-sdk` | Client SDK | A thin, typed client generated/derived from `api-contracts`. |

Plus example workspaces under `examples/` (`minimal-server`,
`reference-adapters`, `openapi-client`) that demonstrate composition without
shipping in the published set.

## Dependency direction

Dependencies point **inward** toward `@third-eye-cyborg/ascended-core`. Nothing in an inner ring
imports from an outer ring.

```
                     @third-eye-cyborg/ascended-core
                          ▲
        ┌─────────────────┼─────────────────┐
   @third-eye-cyborg/ascended-contracts  @third-eye-cyborg/ascended-events  @third-eye-cyborg/ascended-privacy
        ▲                 ▲                 ▲
        └──────┬──────────┴────────┬────────┘
               │                   │
   ai-router · providers · persistence · observability ·
   realtime · media · notifications
               ▲
        ┌──────┴───────┐
   api-contracts     sdk
        ▲
     examples
```

- **core ←** contracts / events / privacy
- **← ai-router / providers / persistence / observability / realtime / media / notifications**
- **← api-contracts / sdk**
- **← examples**

The rule is enforceable by inspection: a package may only import from packages
strictly closer to `core`. This keeps the contract layer free of transport and
vendor concerns, and keeps `core` free of everything else.

## Design principles

### 1. Provider-agnostic ports
Every external capability (auth, storage, email, push, billing, rate-limiting,
search, audit, AI) is expressed as a **port** — a TypeScript interface —
accompanied by an **in-memory adapter** for tests and examples. Real,
vendor-specific adapters live in the downstream app or in separate adapter
repos, never in Core. Ports are described generically ("a cloud identity
provider", "an object-storage provider").

### 2. Privacy-first routing
The AI router evaluates a `PrivacyPolicy` **before** dispatching work.
Enforcement is purely **family-based** (`cloud-text`, `local`, `human`, …) plus a
per-provider allow-list; there is no vendor substring matching. Blocked calls
throw a typed `PrivacyBlockedError` carrying a user-safe message and
redaction-safe telemetry. See [privacy-model](../privacy-model/README.md).

### 3. Event-driven
State changes are published as versioned `DomainEvent`s through an `EventBus`.
Payloads are intentionally minimal (ids + timestamps + `metadata`) so consumers
stay decoupled. Delivery supports idempotency keys, retry, and a dead-letter
sink. The `InMemoryEventBus` plus `createEventHarness` make handler behavior
deterministically testable. See [events](../events/README.md).

### 4. Metadata extensibility
Product-specific vocabulary is never hard-coded into Core. Contracts carry an
optional `metadata?: Metadata` bag (`Record<string, unknown>`), and
`Extensible<T>` adds one to any type. Products attach their own labels (for
example spiritual vocabularies such as chakra or elemental tags) through
`metadata` — Core stays neutral and the same contract serves many products.

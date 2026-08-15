# Ascended Core — Documentation

Ascended Core is an open-source, provider-agnostic engine for building social,
community, real-time, and generative-AI product experiences. It ships a set of
small, versioned TypeScript packages: platform-neutral **contracts**, vendor-free
**provider ports**, a privacy-aware **AI router**, a typed **event system**, and
in-memory reference adapters for tests and examples.

Core is the *engine*. A downstream private product consumes published Core
versions explicitly; Core itself never contains product secrets, production
schemas, billing logic, moderation internals, admin tooling, or real user data.
See [architecture/adoption-model.md](./architecture/adoption-model.md) for how
the engine and a hosted product relate.

## Documentation index

### Architecture
- [Overview & package map](./architecture/overview.md) — the 13 packages,
  dependency direction, and design principles.
- [Adoption model](./architecture/adoption-model.md) — the open-engine /
  private-product relationship and the rules that keep them decoupled.

### Domain & contracts
- [Domain model](./domain-model/README.md) — bounded contexts, their core
  types, and how `metadata` extension points carry product vocabularies.

### Building on Core
- [Provider guide](./provider-guide/README.md) — how to implement a provider
  port, capability descriptors, health reporting, and testing.
- [Privacy model](./privacy-model/README.md) — the three privacy modes,
  family-based enforcement, and redaction-safe telemetry.
- [Events](./events/README.md) — the event envelope, the catalog, idempotency,
  retry/dead-letter, and deterministic testing.
- [API & SDK](./api/README.md) — the reference API surface and an SDK quickstart.

### Operating the project
- [Release process](./release-process/README.md) — semver policy, changelog,
  tag-driven publishing, and support policy.
- [Migration & adoption](./migration-and-adoption/README.md) — the Core Adoption
  Manifest, adoption/contribution workflows, and the "what Core does NOT
  include" boundary.
- [Funding](./migration-and-adoption/funding.md) — sustaining the project via a
  fiscal-hosted collective.

## Conventions used in these docs

- All examples use **synthetic data only** — people like *Ada Example*, domains
  like `example.org`/`example.com`, and ids produced by `createId("post")`.
- Vendors are referred to **generically** ("a cloud identity provider", "an
  object-storage provider"). No real vendor names appear anywhere in Core.
- Product vocabulary (for example spiritual labels) is never hard-coded; it
  travels through `metadata` extension points only.

> The phrase "Ascended Social" may appear in these docs solely to describe the
> downstream private product that adopts Core. It never appears in Core code.

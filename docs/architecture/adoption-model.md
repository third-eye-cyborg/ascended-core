# Adoption Model: Open Engine, Private Product

Ascended Core is an **open engine**. It is developed in public, released as
versioned npm packages, and consumed by a **separate, private hosted product**
that adopts specific Core versions on its own schedule.

This mirrors the well-known **open-engine / private-hosted-product** pattern:
an open-source engine (such as QuantConnect's LEAN engine) is released publicly,
while a commercial hosted service consumes it. We reference *that pattern* by
name for clarity, but no vendor tooling, URL, or account of any kind is required
by or referenced in Core.

Throughout this document, the downstream private product is referred to as
"Ascended Social" only to describe the engine → product relationship. That name
never appears in Core code.

## Two repositories, one direction of flow

```
   ┌────────────────────────────┐         explicit version adoption
   │  Ascended Core (public)    │  ───────────────────────────────▶  ┌──────────────────────────┐
   │  versioned npm packages    │                                     │ Downstream product        │
   │  @ascended/* @ 0.x         │  ◀───────────────────────────────  │ (private, hosted)         │
   └────────────────────────────┘         public PR contributions      └──────────────────────────┘
```

- **Down (adoption):** the private product pins and upgrades `@ascended/*`
  package versions deliberately (see the workflow below).
- **Up (contribution):** improvements discovered while building the product are
  contributed back as **public pull requests** to Core, released, and only then
  adopted downstream.

There is **no bidirectional git syncing** between the two repositories. They are
distinct histories connected solely by published package versions and public
PRs.

## How the private product consumes Core

### Submodule — early development only
During very early exploration it is acceptable to include Core as a git
**submodule** so the two evolve together quickly. This is a temporary
convenience, not a production pattern:

- It is fine for spiking and local iteration.
- It **must not** be used to run the production product.
- It must never become a channel for pushing private changes back into Core.

### Versioned package — production
For anything shipping to users, the product depends on **published, versioned
packages**:

```jsonc
// downstream product package.json (illustrative)
{
  "dependencies": {
    "@ascended/core": "0.1.0",
    "@ascended/contracts": "0.1.0",
    "@ascended/events": "0.1.0",
    "@ascended/privacy": "0.1.0"
  }
}
```

Explicit versions (not `latest`, not git URLs) make adoption auditable and
reversible, and they let the product qualify each Core release before rolling it
out. See [migration-and-adoption](../migration-and-adoption/README.md) for the
Core Adoption Manifest that tracks the state of each package.

## Contribution → release → adoption

The only supported path for a change to reach the private product is through the
public release stream:

1. **Public PR** — the change is proposed against Ascended Core in the open,
   with synthetic-only examples and no vendor names.
2. **Review & merge** — maintainers review against Core's boundaries and merge.
3. **Release** — a tagged, versioned release publishes updated `@ascended/*`
   packages (see [release-process](../release-process/README.md)).
4. **Private adoption PR** — the downstream product opens its own PR to bump the
   adopted version and integrate.

This ordering guarantees that Core never depends on private code, and that every
capability the product relies on exists first as a public, reviewable release.

## Why the separation matters

- **Boundary integrity** — secrets, production schemas, billing, moderation
  internals, admin tooling, and user data stay out of Core by construction.
- **Reusability** — because Core has no product coupling, other products can
  adopt the same packages.
- **Auditability** — explicit versions + public PRs create a clear, one-way
  provenance trail from open contribution to private deployment.

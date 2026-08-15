# Migration & Adoption

This document defines the **Core Adoption Manifest** — how a downstream product
tracks which `@ascended/*` packages it has adopted and at what maturity — plus
the workflows that move changes between the public engine and the private
product, and an explicit statement of what Core does **not** include.

For the broader relationship, see the
[adoption model](../architecture/adoption-model.md).

## The Core Adoption Manifest (`core-adoption.yaml`)

Each downstream product keeps a `core-adoption.yaml` at its repo root recording,
per Core package, the adopted version and its **adoption state**. It is the
single source of truth for what the product depends on and how confident it is
in each dependency.

```yaml
# core-adoption.yaml — lives in the downstream product repo (synthetic example)
manifestVersion: 1
product: ascended-social            # the private product adopting Core
packages:
  "@ascended/core":
    version: "0.1.0"
    state: stable
  "@ascended/contracts":
    version: "0.1.0"
    state: adopted
  "@ascended/events":
    version: "0.1.0"
    state: canary
  "@ascended/privacy":
    version: "0.1.0"
    state: testing
  "@ascended/ai-router":
    version: "0.1.0"
    state: available          # released, not yet adopted here
```

### Adoption states

| State | Meaning | Entry criteria | Exit criteria |
| --- | --- | --- | --- |
| `available` | A released Core version exists but the product has not adopted it. | Package published to the registry. | Product begins evaluating it → `testing`. |
| `testing` | Under evaluation in a non-production/dev environment. | Added as a dependency in a dev/test build. | Green in local + CI against the product's suites → `canary`. |
| `canary` | Rolled out to a limited slice (internal users / small %). | Passed `testing`; behind a flag or limited cohort. | Stable metrics over a soak period → `adopted`. |
| `adopted` | Serving production traffic broadly. | Passed `canary` with acceptable error/latency/telemetry. | Proven durable across releases → `stable`. |
| `stable` | Depended on with high confidence; upgrades are routine. | Sustained production use with no adoption-blocking issues. | A superseding version starts the cycle again, or → `deprecated`. |
| `deprecated` | Scheduled for removal/replacement. | A replacement exists or the capability is being retired. | Removed from the manifest once no code depends on it. |

States only ever move forward through the pipeline (or to `deprecated`); a
regression sends a package back a step with a changelog note explaining why.

## Public → private adoption workflow (6 steps)

Moving a Core capability into the private product:

1. **Identify** a released Core version/capability to adopt (`available`).
2. **Pin** the exact version in the product and mark it `testing` in
   `core-adoption.yaml`.
3. **Integrate & qualify** in a dev/test environment; run the product's full
   suite against it.
4. **Canary** to a limited cohort behind a flag; watch redaction-safe telemetry
   and health.
5. **Adopt** broadly to production once canary metrics are healthy.
6. **Promote to `stable`** after a soak period, and record the final state in
   the manifest.

## Private → public contribution workflow (5 steps)

Moving an improvement discovered downstream back into the open engine:

1. **Extract** the change so it is generic and vendor-free — synthetic examples
   only, no product vocabulary hard-coded, no secrets.
2. **Open a public PR** against Ascended Core with tests, docs, and a changelog
   entry.
3. **Review & merge** by the relevant CODEOWNERS.
4. **Release** the change in a tagged, versioned Core release with provenance
   (see [release process](../release-process/README.md)).
5. **Adopt** the new version downstream via the public → private workflow above
   (never by editing Core in place from the product).

There is **no bidirectional git sync** — the only path back into the product is
through a published version.

## What Core does NOT include (boundary)

Ascended Core is the engine only. The following are **out of scope** and live in
the downstream product or in separate repositories — never in Core:

- **Secrets** — API keys, tokens, credentials, signing keys.
- **Production database schemas / RLS** — real tables, migrations against a
  production database, and row-level-security policies.
- **Billing logic** — pricing, entitlements resolution, subscription lifecycle,
  invoicing.
- **Moderation / compliance internals** — moderation rules, classifiers,
  enforcement policy, and jurisdiction/consent *rules* (Core exposes only neutral
  state and hook points).
- **Admin tooling** — internal dashboards and operator consoles.
- **User data** — any real accounts, content, or personal data.
- **Recommendation ranking** — the actual ranking/scoring models and algorithms
  (Core defines only the request/response *shapes* and routing).

If a change would require any of the above inside Core, it belongs downstream
instead — keep the boundary intact.

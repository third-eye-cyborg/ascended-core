# Provider Guide

Ascended Core describes every external capability as a **port** — a
vendor-neutral TypeScript interface — and ships an **in-memory adapter** for
each so features can be built and tested without any real vendor. Real,
vendor-specific adapters (for "a cloud identity provider", "an object-storage
provider", "a push service", and so on) live in the **downstream app or in
separate adapter repos**, never in Core.

## The ports

From `@ascended/providers`:

| Port | Interface | In-memory adapter |
| --- | --- | --- |
| Auth | `AuthProvider`, `SessionStore` | `InMemoryAuthProvider`, `InMemorySessionStore` |
| Authorization | `PolicyCheckPort` | `AllowAllPolicy`, `RoleBasedPolicy` |
| Storage | `ObjectStoragePort` | `InMemoryObjectStorage` |
| Email | `EmailPort` | `RecordingEmailAdapter` |
| Push | `PushNotificationPort` | `RecordingPushAdapter` |
| Billing | `BillingPort` | `StubBillingAdapter` |
| Rate limit | `RateLimiterPort` | `FixedWindowRateLimiter` |
| Search | `SearchIndexPort` | `InMemorySearchIndex` |
| Audit | `AuditLogPort` | `InMemoryAuditLog` |

AI ports live in `@ascended/providers` (`TextGenerationPort`,
`ImageGenerationPort`, `ThreeDGenerationPort`, `RecommendationPort`) and are
routed with privacy awareness by `@ascended/ai-router`.

## Implementing a port

Pick the port interface, implement its methods, and keep all vendor detail
inside your adapter. Nothing about the vendor should leak into the return types
— they are Core's neutral shapes.

```ts
import type {
  AuthProvider,
  AuthSession,
  IssuedSession,
} from "@ascended/providers";
import { createId, nowIso, type EntityId } from "@ascended/core";

// Adapter for "a cloud identity provider" — the vendor lives only in here.
export class CloudIdentityAuthProvider implements AuthProvider {
  async verifySession(token: string): Promise<AuthSession | null> {
    // call the external identity service, map its response to AuthSession
    // return null when the token is invalid/expired
    return null;
  }

  async issueSession(accountId: EntityId): Promise<IssuedSession> {
    const session: AuthSession = {
      sessionId: createId("sess"),
      accountId,
      issuedAt: nowIso(),
      expiresAt: nowIso(), // compute real expiry in a real adapter
    };
    return { token: "opaque-bearer-token", session };
  }
}
```

Guidelines:

- **Return neutral shapes.** Map vendor payloads into Core types; never return
  vendor-specific objects.
- **Never log secrets or bodies.** Tokens, prompts, and message bodies must not
  be logged verbatim. Use redaction-safe telemetry (see
  [privacy-model](../privacy-model/README.md)).
- **Fail with `CoreError`.** Throw `CoreError` with a stable `ErrorCode`
  (`PROVIDER_ERROR`, `PROVIDER_TIMEOUT`, `UNAVAILABLE`, `RATE_LIMITED`, …) and a
  user-safe message.

## Capability descriptors

AI providers declare a generic `family` (`local`, `cloud-text`, `cloud-image`,
`cloud-3d`, `remote-inference`, `embeddings`, `human`) and report what they can
do via a `CapabilityDescriptor`. The router asks a provider whether it can serve
a request on a given platform **before** dispatching:

```ts
import type { CapabilityDescriptor } from "@ascended/ai-router";

const descriptor: CapabilityDescriptor = {
  available: true,
  estimatedLatencyMs: 600,
  // for on-device families you might also set:
  // requiresExplicitInstall: true, downloadSizeBytes: 2_000_000_000,
};

const blocked: CapabilityDescriptor = {
  available: false,
  unavailableReason: "Local image generation unavailable on this platform",
};
```

`getBaselineCapability({ domain, family, platform })` provides deterministic
baselines (for example, local text inference is available on desktop but not on
mobile). Adapters can extend these with dynamic checks (installed models, VRAM,
battery).

## Health reporting

Providers report readiness so the router can degrade or fail over gracefully.
Health folds into capabilities:

```ts
import {
  applyHealthToCapability,
  ProviderState,
  type ProviderHealthSnapshot,
} from "@ascended/ai-router";

const health: ProviderHealthSnapshot = {
  providerName: "example-text-provider",
  state: ProviderState.DEGRADED,
  checkedAt: "2024-01-01T00:00:00.000Z",
  reason: "elevated latency",
};

const effective = applyHealthToCapability(descriptor, health);
// AVAILABLE → unchanged; DEGRADED → keeps available but annotates a reason;
// UNAVAILABLE → available:false
```

Non-AI ports that need health surface it through `@ascended/observability`
(`HealthAggregator`, `ProviderHealthTracker`) using the core `HealthState`
(`HEALTHY`/`DEGRADED`/`UNHEALTHY`).

## Testing against in-memory adapters

Build and test features entirely against the in-memory adapters — no network,
fully deterministic:

```ts
import { InMemoryAuthProvider } from "@ascended/providers";
import { LocalEchoTextProvider } from "@ascended/ai-router";

const auth = new InMemoryAuthProvider();
const text = new LocalEchoTextProvider(); // synthetic stub, tests/examples only
```

The `@ascended/ai-router` stubs (`LocalEchoTextProvider`,
`LocalPlaceholderImageProvider`, `LocalStub3DProvider`,
`StaticRecommendationProvider`, `HumanOnlyRecommendationProvider`) exist purely
for tests and examples and never call out to any service.

## The placement rule

> **Production adapters for specific vendors live in the downstream app or in
> separate adapter repositories — never in Ascended Core.**

Core ships ports and in-memory adapters only. This keeps Core vendor-free,
keeps secrets and vendor coupling out of the public repo, and lets any product
swap vendors without changing a single Core contract.

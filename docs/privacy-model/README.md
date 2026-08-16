# Privacy Model

`@third-eye-cyborg/ascended-privacy` makes privacy a **first-class routing concern**. Before any
provider call is dispatched (especially AI calls routed by
`@third-eye-cyborg/ascended-ai-router`), a `PrivacyPolicyEnforcer` decides whether it is allowed
under the user's active **privacy mode**. Enforcement is declarative,
family-based, and vendor-free — decisions never depend on a vendor's name.

## The three privacy modes

`PrivacyMode` (from `@third-eye-cyborg/ascended-privacy`):

| Mode | Value | Meaning |
| --- | --- | --- |
| **Cloud** | `cloud` | Remote/cloud provider families are permitted. |
| **Private-local** | `private-local` | Only on-device/local families are permitted, unless a specific provider is explicitly allow-listed. |
| **Human-only** | `human` | No automated provider calls at all — results come from human/community sources only. |

`defaultPolicyForMode(mode)` produces a sensible default `PrivacyPolicy` for
each:

- **Cloud** → nothing blocked.
- **Private-local** → all cloud families blocked (`cloud-text`, `cloud-image`,
  `cloud-3d`, `remote-inference`, `embeddings`); `local` remains available.
- **Human-only** → every non-human family blocked (including `local`).

## Family-based enforcement

Providers declare a generic **family**, not a vendor name. Policies block
**families**, so enforcement is portable and auditable:

```ts
import {
  PrivacyMode,
  ProviderFamilies,
  defaultPolicyForMode,
  createEnforcer,
  createRequestContext,
} from "@third-eye-cyborg/ascended-privacy";

const policy = defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL);
const enforcer = createEnforcer(policy);

const context = createRequestContext({
  requestId: "req_example",
  platform: "web",
  feature: "compose",
});

// Allowed: the local family is permitted in private-local mode.
enforcer.validateProviderCall("local-echo", ProviderFamilies.LOCAL, context);

// Blocked: throws PrivacyBlockedError with a user-safe message.
enforcer.validateProviderCall(
  "example-text-provider",
  ProviderFamilies.CLOUD_TEXT,
  context,
);
```

There is **no vendor substring matching**. The enforcer looks only at (a) the
per-provider allow-list and (b) the set of blocked families.

## Allow-lists (the per-provider escape hatch)

`PrivacyPolicy.allowedCloudProviders` lets a *specific* provider through even
when its family is blocked. Use it sparingly and intentionally — for example, to
permit one vetted provider in private-local mode:

```ts
const policy = {
  ...defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL),
  allowedCloudProviders: ["example-text-provider"], // by provider name
};
```

The allow-list is checked *first*, so an allow-listed provider is permitted even
if its family appears in `blockedFamilies`.

## User-safe blocked messages

When a call is blocked, the enforcer throws `PrivacyBlockedError` (a `CoreError`
with `code = PRIVACY_BLOCKED`, `statusCode = 403`). It carries:

- A **user-safe `message`** (`blockMessage` if set on the policy, otherwise a
  sensible default per mode). These messages never reveal internal detail — e.g.
  *"Cloud provider families are not available in Private Local mode. Use a local
  provider instead."*
- A redaction-safe **`blockedCall`** telemetry payload (see below).

```ts
import { PrivacyBlockedError } from "@third-eye-cyborg/ascended-privacy";

try {
  enforcer.validateProviderCall("x", "cloud-image", context);
} catch (err) {
  if (PrivacyBlockedError.isPrivacyBlockedError(err)) {
    showToUser(err.message);          // user-safe
    recordTelemetry(err.blockedCall); // redaction-safe
  }
}
```

## Data minimization + redaction-safe telemetry

The privacy package provides minimization helpers so observability never leaks
user data:

- **`redactKeys` / `pickFields`** — keep only the fields you intend to record.
- **`hashUserId`** — record a stable hash instead of a raw account id.
- **`redactTelemetry`** and **`sanitizeTelemetry`** — strip forbidden keys.
- **`FORBIDDEN_TELEMETRY_KEYS`** — the deny-list of keys that must never appear
  in telemetry (secrets, raw bodies, PII).

`BlockedCall` telemetry is deliberately minimal: timestamp, request id, event
type, generic provider name + family, a reason code, the user-safe message, and
a small metadata bag (platform, feature, privacy mode). No prompts, no bodies,
no secrets.

## Consent & jurisdiction hook points

Privacy exposes hook points so products can plug in their own consent and
jurisdiction logic **without Core embedding any compliance rules**:

- **`isConsentRequired` / `IsConsentRequired`** and **`ConsentDecision`** — a
  hook to decide whether consent is needed before a given call.
- **`JurisdictionRouter`** — a hook to route/deny based on jurisdiction.

Core defines the *shape* of these decisions; the actual consent and compliance
policies (which are product- and jurisdiction-specific) live downstream. This
keeps moderation/compliance internals out of Core while giving products a
first-class place to enforce them.

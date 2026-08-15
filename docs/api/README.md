# API & SDK

Ascended Core ships two transport-facing packages:

- **`@ascended/api-contracts`** — vendor-neutral request/response contracts and
  the API specification that clients target. It layers on top of
  `@ascended/contracts` (domain types) and `@ascended/core` (ids, `Result`,
  `CoreError`).
- **`@ascended/sdk`** — a thin, typed client derived from `api-contracts` for
  consuming the API from applications and examples.

> **Status:** `@ascended/api-contracts` and `@ascended/sdk` are being brought up
> alongside the core packages. This document describes the **planned reference
> surface** they expose; where a formal OpenAPI/spec artifact exists in
> `packages/api-contracts`, it is the source of truth and supersedes the summary
> below. The `examples/openapi-client` workspace demonstrates consuming the
> generated client.

## Reference API surface (summary)

The API surface follows the bounded contexts in
[the domain model](../domain-model/README.md). Resources use the same opaque,
prefixed ids (`acct_…`, `post_…`) and ISO-8601 timestamps, and every resource
carries the optional `metadata` extension point.

| Area | Representative operations | Domain types |
| --- | --- | --- |
| Identity | create/read profile, read presence | `Account`, `IdentityProfile`, `PresenceRecord` |
| Content | publish/read posts, comment, react, bookmark | `Post`, `Comment`, `Reaction`, `Bookmark` |
| Community | create community/channel, join, invite | `Community`, `Channel`, `Membership`, `Invite` |
| Conversation | start conversation, send message | `Conversation`, `Message` |
| Events | create event, RSVP | `CommunityEvent`, `Rsvp`, `LiveSession` |
| Realtime | join room, session lifecycle | `RoomDescriptor`, `CallSession` |
| Avatar | create avatar, poll generation | `AvatarProfile`, `AvatarGeneration` |
| Search | search, recommendations | `SearchQuery`, `SearchResultSet`, `RecommendationResponse` |
| Media | begin upload, transform | (`@ascended/media` contracts) |
| Notifications | preferences, inbox | (`@ascended/notifications` contracts) |

### Cross-cutting conventions

- **Auth** — requests present an opaque bearer token resolved by an
  `AuthProvider` adapter (see [provider guide](../provider-guide/README.md)).
  Core describes the token generically; the identity vendor lives downstream.
- **Errors** — failures map from `CoreError` to HTTP via `ErrorCode` +
  `statusCode` (for example `PRIVACY_BLOCKED` → 403, `NOT_FOUND` → 404,
  `RATE_LIMITED` → 429). Error bodies carry the machine `code` and a user-safe
  `message` — never secrets or PII.
- **Pagination** — list endpoints use opaque forward cursors (`cursor` /
  `nextCursor`), mirroring the search contracts.
- **Privacy** — AI-backed endpoints are subject to the active `PrivacyMode`;
  blocked calls return a user-safe message (see
  [privacy model](../privacy-model/README.md)).

## SDK quickstart

The SDK is a thin, typed wrapper over the API contracts. It returns the same
neutral domain shapes and surfaces failures as `CoreError`.

```ts
// Illustrative usage — see packages/sdk and examples/openapi-client for the
// exact, generated client surface.
import { createClient } from "@ascended/sdk";

const client = createClient({
  baseUrl: "https://api.example.org",
  // opaque bearer token issued by your AuthProvider adapter
  token: "opaque-bearer-token",
});

// Publish a post
const post = await client.content.publishPost({
  body: "Hello from Ada Example",
  visibility: "public",
  metadata: { element: "water" }, // product vocabulary via metadata
});

// Read it back
const fetched = await client.content.getPost({ postId: post.id });
```

Guidelines for SDK consumers:

- Treat ids as **opaque**; do not parse meaning beyond the prefix.
- Pass product-specific fields through **`metadata`**, not custom top-level keys.
- Handle `CoreError` by `code`; show `message` to users as-is (it is user-safe).

See [`examples/minimal-server`](../../examples/minimal-server) for composing the
ports behind an API, and [`examples/openapi-client`](../../examples/openapi-client)
for consuming the client.

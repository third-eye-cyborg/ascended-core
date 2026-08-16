# Domain Model

`@third-eye-cyborg/ascended-contracts` defines platform-neutral domain types organized into
**bounded contexts**. Contracts are pure types plus small runtime type guards —
no I/O, no persistence, no transport. Every context exposes typed shapes and
`is*` guards (for example `isPost`, `isAccount`) so producers and consumers can
validate at boundaries.

## Shared foundations

All contracts build on `@third-eye-cyborg/ascended-core`:

- **`EntityId`** — an opaque, prefixed string id (`acct_…`, `post_…`). Created
  with `createId("post")`; validated with `isEntityId`. Contracts never depend
  on a database sequence or UUID strategy.
- **`IsoTimestamp`** — ISO-8601 UTC timestamps for `createdAt`/`updatedAt`.
- **`Metadata`** — `Record<string, unknown>`, the extension point (see below).

```ts
import { createId } from "@third-eye-cyborg/ascended-core";
import { isPost, ContentVisibility, type Post } from "@third-eye-cyborg/ascended-contracts";

const post: Post = {
  id: createId("post"),
  authorId: createId("acct"),
  body: "Hello from Ada Example",
  visibility: ContentVisibility.PUBLIC,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

isPost(post); // true
```

## Metadata extension points

Every contract carries an optional `metadata?: Metadata`. Product-specific
vocabularies attach here rather than being hard-coded into Core. For example, a
downstream product could tag content with its own spiritual labels **without any
change to the contract**:

```ts
const taggedPost: Post = {
  ...post,
  metadata: {
    // product-defined vocabulary; Core stays neutral
    element: "water",
    chakra: "heart",
  },
};
```

Core never defines, validates, or enforces these keys — it only preserves the
`metadata` bag. Values must be JSON-serializable and must never contain secrets.

---

## Bounded contexts

### Identity (`identity.ts`)
Accounts and public profiles, plus presence.

- **`Account`** — `id`, `handle` (synthetic, e.g. `"ada-example"`), `email`,
  `displayName`, timestamps. Authentication lives in adapters, not here.
- **`IdentityProfile`** — public-facing profile (`displayName`, `bio?`,
  `avatarUrl?`) linked to an account.
- **`PresenceRecord`** + **`PresenceStatus`** (`ONLINE`/`AWAY`/`BUSY`/
  `OFFLINE`/`INVISIBLE`) — point-in-time presence with `lastSeenAt`.
- Guards: `isAccount`, `isIdentityProfile`, `isPresenceStatus`,
  `isPresenceRecord`.

### Content (`content.ts`)
Authored content and moderation *state* (not rules).

- **`Post`** — `authorId`, `body`, `visibility` (`ContentVisibility`:
  `PUBLIC`/`UNLISTED`/`FOLLOWERS`/`PRIVATE`), optional `attachments`.
- **`Comment`** — belongs to a `postId`, optional `parentId` for replies.
- **`Reaction`** — open `kind: string` so products define their own reaction
  vocabularies via metadata/kind.
- **`Bookmark`**, **`MediaAttachment`** (`MediaKind`: image/video/audio/document).
- **`ModerationSurface`** + **`ModerationState`** (`PENDING`/`APPROVED`/
  `REJECTED`/`ESCALATED`) — carries state only; moderation internals are **not**
  part of Core.

### Community (`community.ts`)
Grouping people, channels, and roles.

- **`Community`** (`name`, `ownerId`), **`Channel`** (`ChannelKind`:
  text/voice/video/announcement), **`Role`** (open `permissions: string[]`),
  **`Membership`** (`roleIds`), **`Invite`** (`code`, optional `expiresAt`).
- Contracts do not enforce permission semantics — products interpret the keys.

### Conversation (`conversation.ts`)
Direct and group messaging.

- **`Conversation`** (`ConversationKind`: direct/group, `participantIds`).
- **`Message`** with **`MessageDeliveryState`** (`PENDING`/`SENT`/`DELIVERED`/
  `READ`/`FAILED`).

### Events (`events.ts`)
Community events and live sessions.

- **`CommunityEvent`** + **`EventKind`**, **`Rsvp`** + **`RsvpStatus`**,
  **`LiveSession`**. (Distinct from the *domain-event bus* in
  `@third-eye-cyborg/ascended-events` — this context models user-facing scheduled events.)

### Realtime (`realtime.ts`)
Room and call descriptors mirrored as contracts.

- **`RoomDescriptor`**, **`RoomParticipant`**, **`CallSession`** +
  **`CallSessionState`**. The behavioral implementations live in
  `@third-eye-cyborg/ascended-realtime`.

### Avatar (`avatar.ts`)
Character avatars and their generation jobs — vendor-neutral.

- **`AvatarProfile`** with opaque `modelRef?`/`thumbnailRef?` resolved by media
  adapters.
- **`AvatarGeneration`** + **`AvatarGenerationState`** (`QUEUED`/`PROCESSING`/
  `SUCCEEDED`/`FAILED`), with an opaque `resultRef?`. No generation provider is
  ever named.

### Search (`search.ts`)
Search and recommendation request/response shapes.

- **`SearchQuery`** (`text`, generic `filters`, cursor pagination),
  **`SearchResult`**/**`SearchResultSet`** (opaque `nextCursor`).
- **`RecommendationRequest`** (`surface`, e.g. `"home-feed"`),
  **`RecommendationItem`** (generic `reason?`), **`RecommendationResponse`**.
  Ranking *logic* is not part of Core.

### Audit (`audit.ts`)
- **`AuditEvent`** + `isAuditEvent` — a neutral audit record shape. Audit
  *storage* is a provider port (`@third-eye-cyborg/ascended-providers`), and audit trails contain
  no secrets or PII.

---

## Working with contracts

- **Validate at boundaries.** Use the `is*` guards when accepting external data;
  `noUncheckedIndexedAccess` is on, so guards check keys defensively.
- **Prefer `metadata` over new fields.** If a product needs an extra attribute,
  put it in `metadata` first; only propose a contract change (a public PR) when
  a concept is genuinely cross-product.
- **Keep ids opaque.** Never parse meaning out of an id beyond its prefix via
  `idPrefix`.

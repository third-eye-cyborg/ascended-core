# Events

`@ascended/events` provides typed, **versioned** domain events, an `EventBus`
contract, idempotency and retry/dead-letter semantics, and a deterministic
in-memory test harness. Events keep producers and consumers decoupled: payloads
are minimal (ids + timestamps + `metadata`) and product vocabulary rides in
`metadata` rather than in the event schema.

## The event envelope

Every event on the bus is a `DomainEvent<TPayload>` — a stable wrapper around a
type-specific payload:

```ts
interface DomainEvent<TPayload = unknown> {
  id: string;             // unique id for this event instance
  type: string;           // dotted type, e.g. "content.post_published"
  version: number;        // schema version of `payload` for this type
  occurredAt: string;     // ISO-8601 UTC
  producer: string;       // producing service, e.g. "example-service"
  idempotencyKey: string; // stable key to dedupe redeliveries
  correlationId?: string; // correlate a logical workflow
  causationId?: string;   // the event that directly caused this one
  payload: TPayload;
}
```

The envelope is validated by `envelopeMetaSchema`; `domainEventSchema(payload)`
builds a full validator for a specific payload schema.

## The event catalog (10 types)

`EVENT_CATALOG` maps each canonical `type` to its current `version` and a zod
payload schema. Every payload includes an optional `metadata` bag.

| Constant | Type | Version | Key payload fields |
| --- | --- | --- | --- |
| `IDENTITY_PROFILE_CREATED` | `identity.profile_created` | 1 | `accountId`, `profileId`, `createdAt` |
| `CONTENT_POST_PUBLISHED` | `content.post_published` | 1 | `postId`, `authorId`, `publishedAt` |
| `COMMUNITY_MEMBER_JOINED` | `community.member_joined` | 1 | `communityId`, `accountId`, `membershipId`, `joinedAt` |
| `CONVERSATION_MESSAGE_SENT` | `conversation.message_sent` | 1 | `conversationId`, `messageId`, `senderId`, `sentAt` |
| `EVENT_RSVP_CONFIRMED` | `event.rsvp_confirmed` | 1 | `eventId`, `rsvpId`, `accountId`, `confirmedAt` |
| `REALTIME_ROOM_JOINED` | `realtime.room_joined` | 1 | `roomId`, `participantId`, `accountId`, `joinedAt` |
| `MEDIA_ASSET_UPLOADED` | `media.asset_uploaded` | 1 | `assetId`, `ownerId`, `uploadedAt` |
| `NOTIFICATION_REQUESTED` | `notification.requested` | 1 | `notificationId`, `recipientId`, `requestedAt` |
| `RECOMMENDATION_GENERATED` | `recommendation.generated` | 1 | `requestId`, `accountId`, `generatedAt` |
| `MODERATION_REVIEW_REQUESTED` | `moderation.review_requested` | 1 | `surfaceId`, `contentId`, `requestedAt` |

Look up an entry at runtime with `getCatalogEntry(type)`. Payloads stay generic
on purpose — a product tags an event with its own vocabulary through `metadata`,
not by changing the schema.

### Versioning payloads

Each type carries a `version`. Add fields backward-compatibly at the same
version; make a breaking payload change by publishing a **new version** and
keeping consumers tolerant. The catalog is the single source of truth for the
current version of each type.

## Publishing and subscribing

The `EventBus` contract exposes `publish`, `subscribe` (with
`SubscriptionOptions`), and returns an `Unsubscribe`. Handlers are typed
`EventHandler`s.

```ts
import {
  InMemoryEventBus,
  EVENT_TYPES,
  contentPostPublishedPayload,
} from "@ascended/events";
import { createId, nowIso } from "@ascended/core";

const bus = new InMemoryEventBus();

const off = bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, async (event) => {
  // event.payload validated against contentPostPublishedPayload
  console.log("published", event.payload.postId);
});

await bus.publish({
  id: createId("evt"),
  type: EVENT_TYPES.CONTENT_POST_PUBLISHED,
  version: 1,
  occurredAt: nowIso(),
  producer: "example-service",
  idempotencyKey: "post-123:published",
  payload: {
    postId: createId("post"),
    authorId: createId("acct"),
    publishedAt: nowIso(),
  },
});

off();
```

## Idempotency

Each event carries an `idempotencyKey`. Consumers should treat delivery as
**at-least-once** and dedupe on that key so redeliveries are safe. Choose a key
derived from the logical fact (for example `"post-123:published"`), not a random
value, so the same fact always produces the same key.

## Retry & dead-letter

`DeliveryPolicy` (with `DEFAULT_DELIVERY_POLICY`) governs retry behavior; a
`DeadLetterSink` receives `DeadLetterRecord`s for events that exhaust their
retries. This keeps a poison message from blocking the stream while preserving
it for inspection and replay.

```ts
import { DEFAULT_DELIVERY_POLICY } from "@ascended/events";
// configure an InMemoryEventBus with a delivery policy + a dead-letter sink
```

## Deterministic testing

`createEventHarness` wraps an `InMemoryEventBus` for tests: publish events,
drain the queue deterministically, and assert on what handlers received —
without timers or network.

```ts
import { createEventHarness } from "@ascended/events";

const harness = createEventHarness();
// publish through the harness, then inspect delivered/dead-lettered events
```

Use the harness to assert idempotent handling (publish the same
`idempotencyKey` twice → handled once) and dead-letter routing (a handler that
throws past its retries → the event lands in the dead-letter sink).

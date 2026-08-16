/**
 * @third-eye-cyborg/ascended-events
 *
 * Typed, versioned domain events with an event-bus contract, idempotency,
 * retry/dead-letter interfaces, and a deterministic in-memory test harness.
 */

// envelope
export { envelopeMetaSchema, domainEventSchema } from "./envelope";
export type { DomainEvent } from "./envelope";

// catalog
export {
  EVENT_TYPES,
  EVENT_CATALOG,
  getCatalogEntry,
  identityProfileCreatedPayload,
  contentPostPublishedPayload,
  communityMemberJoinedPayload,
  conversationMessageSentPayload,
  eventRsvpConfirmedPayload,
  realtimeRoomJoinedPayload,
  mediaAssetUploadedPayload,
  notificationRequestedPayload,
  recommendationGeneratedPayload,
  moderationReviewRequestedPayload,
} from "./catalog";
export type { EventType, EventCatalogEntry } from "./catalog";

// bus
export type {
  EventBus,
  EventHandler,
  SubscriptionOptions,
  Unsubscribe,
} from "./bus";

// delivery
export { DEFAULT_DELIVERY_POLICY } from "./delivery";
export type { DeliveryPolicy, DeadLetterRecord, DeadLetterSink } from "./delivery";

// in-memory bus
export { InMemoryEventBus } from "./in-memory-bus";
export type { InMemoryEventBusOptions } from "./in-memory-bus";

// testing
export { createEventHarness } from "./testing";
export type { EventHarness, CreateEventHarnessOptions } from "./testing";

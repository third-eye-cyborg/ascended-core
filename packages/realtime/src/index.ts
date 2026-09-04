/**
 * `@third-eye-cyborg/realtime` — room lifecycle, presence, pub/sub, and call/session
 * abstractions with local in-memory implementations.
 */

export type { DomainEvent, EventBus } from "./events";

export type {
  CreateRoomOptions,
  Room,
  RoomManager,
  RoomParticipant,
} from "./rooms";
export { RoomState } from "./rooms";

export type { Clock, PresenceEntry, PresenceTracker } from "./presence";
export { PresenceStatus } from "./presence";

export type { MessageHandler, PubSubPort, Unsubscribe } from "./pubsub";

export type {
  CallParticipant,
  CallSession,
  CallSessionPort,
  CreateCallSessionOptions,
  MediaState,
} from "./calls";
export { CallSessionState, defaultMediaState } from "./calls";

export type {
  DeliveryAttempt,
  WebhookDeliveryPort,
  WebhookEndpoint,
} from "./webhook-delivery";
export {
  RecordingWebhookDelivery,
  serializeEvent,
  signPayload,
  verifySignature,
} from "./webhook-delivery";

export {
  LocalCallSessions,
  LocalPresenceTracker,
  LocalPubSub,
  LocalRoomManager,
  systemClock,
} from "./local";

/**
 * The event catalog: the canonical set of domain-event types, each with a
 * current schema version and a zod payload schema.
 *
 * Payload fields are intentionally generic (ids + timestamps + a few minimal
 * fields). Product-specific vocabularies attach via the generic `metadata`
 * field rather than being hard-coded here.
 */

import { z } from "zod";

/** Canonical dotted event-type names. */
export const EVENT_TYPES = {
  IDENTITY_PROFILE_CREATED: "identity.profile_created",
  CONTENT_POST_PUBLISHED: "content.post_published",
  COMMUNITY_MEMBER_JOINED: "community.member_joined",
  CONVERSATION_MESSAGE_SENT: "conversation.message_sent",
  EVENT_RSVP_CONFIRMED: "event.rsvp_confirmed",
  REALTIME_ROOM_JOINED: "realtime.room_joined",
  MEDIA_ASSET_UPLOADED: "media.asset_uploaded",
  NOTIFICATION_REQUESTED: "notification.requested",
  RECOMMENDATION_GENERATED: "recommendation.generated",
  MODERATION_REVIEW_REQUESTED: "moderation.review_requested",
} as const;

/** Union of the canonical event-type string literals. */
export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

const id = z.string().min(1);
const ts = z.string().min(1);
const metadata = z.record(z.unknown()).optional();

/** Payload schema for `identity.profile_created`. */
export const identityProfileCreatedPayload = z.object({
  accountId: id,
  profileId: id,
  createdAt: ts,
  metadata,
});

/** Payload schema for `content.post_published`. */
export const contentPostPublishedPayload = z.object({
  postId: id,
  authorId: id,
  publishedAt: ts,
  metadata,
});

/** Payload schema for `community.member_joined`. */
export const communityMemberJoinedPayload = z.object({
  communityId: id,
  accountId: id,
  membershipId: id,
  joinedAt: ts,
  metadata,
});

/** Payload schema for `conversation.message_sent`. */
export const conversationMessageSentPayload = z.object({
  conversationId: id,
  messageId: id,
  senderId: id,
  sentAt: ts,
  metadata,
});

/** Payload schema for `event.rsvp_confirmed`. */
export const eventRsvpConfirmedPayload = z.object({
  eventId: id,
  rsvpId: id,
  accountId: id,
  confirmedAt: ts,
  metadata,
});

/** Payload schema for `realtime.room_joined`. */
export const realtimeRoomJoinedPayload = z.object({
  roomId: id,
  participantId: id,
  accountId: id,
  joinedAt: ts,
  metadata,
});

/** Payload schema for `media.asset_uploaded`. */
export const mediaAssetUploadedPayload = z.object({
  assetId: id,
  ownerId: id,
  uploadedAt: ts,
  metadata,
});

/** Payload schema for `notification.requested`. */
export const notificationRequestedPayload = z.object({
  notificationId: id,
  recipientId: id,
  requestedAt: ts,
  metadata,
});

/** Payload schema for `recommendation.generated`. */
export const recommendationGeneratedPayload = z.object({
  requestId: id,
  accountId: id,
  generatedAt: ts,
  metadata,
});

/** Payload schema for `moderation.review_requested`. */
export const moderationReviewRequestedPayload = z.object({
  surfaceId: id,
  contentId: id,
  requestedAt: ts,
  metadata,
});

/**
 * A catalog entry pairs an event type with its current schema version and the
 * zod schema validating that version's payload.
 */
export interface EventCatalogEntry {
  type: EventType;
  version: number;
  payloadSchema: z.ZodTypeAny;
}

/** The complete event catalog, keyed by event type. */
export const EVENT_CATALOG: Record<EventType, EventCatalogEntry> = {
  [EVENT_TYPES.IDENTITY_PROFILE_CREATED]: {
    type: EVENT_TYPES.IDENTITY_PROFILE_CREATED,
    version: 1,
    payloadSchema: identityProfileCreatedPayload,
  },
  [EVENT_TYPES.CONTENT_POST_PUBLISHED]: {
    type: EVENT_TYPES.CONTENT_POST_PUBLISHED,
    version: 1,
    payloadSchema: contentPostPublishedPayload,
  },
  [EVENT_TYPES.COMMUNITY_MEMBER_JOINED]: {
    type: EVENT_TYPES.COMMUNITY_MEMBER_JOINED,
    version: 1,
    payloadSchema: communityMemberJoinedPayload,
  },
  [EVENT_TYPES.CONVERSATION_MESSAGE_SENT]: {
    type: EVENT_TYPES.CONVERSATION_MESSAGE_SENT,
    version: 1,
    payloadSchema: conversationMessageSentPayload,
  },
  [EVENT_TYPES.EVENT_RSVP_CONFIRMED]: {
    type: EVENT_TYPES.EVENT_RSVP_CONFIRMED,
    version: 1,
    payloadSchema: eventRsvpConfirmedPayload,
  },
  [EVENT_TYPES.REALTIME_ROOM_JOINED]: {
    type: EVENT_TYPES.REALTIME_ROOM_JOINED,
    version: 1,
    payloadSchema: realtimeRoomJoinedPayload,
  },
  [EVENT_TYPES.MEDIA_ASSET_UPLOADED]: {
    type: EVENT_TYPES.MEDIA_ASSET_UPLOADED,
    version: 1,
    payloadSchema: mediaAssetUploadedPayload,
  },
  [EVENT_TYPES.NOTIFICATION_REQUESTED]: {
    type: EVENT_TYPES.NOTIFICATION_REQUESTED,
    version: 1,
    payloadSchema: notificationRequestedPayload,
  },
  [EVENT_TYPES.RECOMMENDATION_GENERATED]: {
    type: EVENT_TYPES.RECOMMENDATION_GENERATED,
    version: 1,
    payloadSchema: recommendationGeneratedPayload,
  },
  [EVENT_TYPES.MODERATION_REVIEW_REQUESTED]: {
    type: EVENT_TYPES.MODERATION_REVIEW_REQUESTED,
    version: 1,
    payloadSchema: moderationReviewRequestedPayload,
  },
};

/** Look up a catalog entry by event type, if known. */
export function getCatalogEntry(type: string): EventCatalogEntry | undefined {
  return (EVENT_CATALOG as Record<string, EventCatalogEntry>)[type];
}

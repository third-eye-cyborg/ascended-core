/**
 * Wire (JSON) shapes returned by the reference API and the serializers that
 * map internal domain contracts onto them.
 *
 * These shapes mirror the reference API contract: profiles, posts, reactions,
 * communities, memberships, events, RSVPs, and notifications. Keeping the
 * serializers here isolates the HTTP surface from the internal domain model.
 */

import { CoreError, ErrorCode } from "@third-eye-cyborg/ascended-core";
import type {
  Community,
  CommunityEvent,
  IdentityProfile,
  Membership,
  Post,
  Reaction,
  Rsvp,
} from "@third-eye-cyborg/ascended-contracts";
import type { InboxItem } from "@third-eye-cyborg/ascended-notifications";

/** Health probe response body. */
export interface HealthWire {
  status: "ok";
  version?: string;
}

/** Public profile wire shape. */
export interface ProfileWire {
  id: string;
  accountId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
}

/** Authored post wire shape. */
export interface PostWire {
  id: string;
  authorId: string;
  communityId?: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Reaction wire shape. */
export interface ReactionWire {
  id: string;
  postId: string;
  profileId: string;
  kind: string;
  metadata?: Record<string, unknown>;
}

/** Community wire shape. */
export interface CommunityWire {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/** Membership wire shape. */
export interface MembershipWire {
  communityId: string;
  profileId: string;
  role: "member" | "moderator" | "owner";
  metadata?: Record<string, unknown>;
}

/** Community event wire shape. */
export interface EventWire {
  id: string;
  communityId?: string;
  title: string;
  description?: string;
  startsAt: string;
  metadata?: Record<string, unknown>;
}

/** RSVP wire shape. */
export interface RsvpWire {
  eventId: string;
  profileId: string;
  status: "going" | "maybe" | "declined";
  metadata?: Record<string, unknown>;
}

/** Notification wire shape. */
export interface NotificationWire {
  id: string;
  accountId: string;
  kind: string;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** A cursor-paginated page of items. */
export interface PageWire<T> {
  items: T[];
  nextCursor?: string;
}

/** Standard error body returned for non-2xx responses. */
export interface ErrorWire {
  error: string;
  message: string;
  code?: string;
}

function withOptional<T extends Record<string, unknown>>(
  base: T,
  extras: Record<string, unknown | undefined>,
): T {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(extras)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

/** Serialize an {@link IdentityProfile} onto its wire shape. */
export function toProfileWire(profile: IdentityProfile): ProfileWire {
  return withOptional(
    { id: profile.id, accountId: profile.accountId, displayName: profile.displayName },
    { bio: profile.bio, avatarUrl: profile.avatarUrl, metadata: profile.metadata },
  );
}

/** Serialize a {@link Post} onto its wire shape. */
export function toPostWire(post: Post): PostWire {
  const communityId =
    typeof post.metadata?.["communityId"] === "string"
      ? (post.metadata["communityId"] as string)
      : undefined;
  return withOptional(
    { id: post.id, authorId: post.authorId, content: post.body, createdAt: post.createdAt },
    { communityId, metadata: post.metadata },
  );
}

/** Serialize a {@link Reaction} onto its wire shape. */
export function toReactionWire(reaction: Reaction): ReactionWire {
  return withOptional(
    {
      id: reaction.id,
      postId: reaction.targetId,
      profileId: reaction.accountId,
      kind: reaction.kind,
    },
    { metadata: reaction.metadata },
  );
}

/** Serialize a {@link Community} onto its wire shape. */
export function toCommunityWire(community: Community): CommunityWire {
  return withOptional(
    { id: community.id, name: community.name },
    { description: community.description, metadata: community.metadata },
  );
}

/** Serialize a {@link Membership} onto its wire shape. */
export function toMembershipWire(membership: Membership): MembershipWire {
  const role =
    (membership.metadata?.["role"] as MembershipWire["role"] | undefined) ?? "member";
  return withOptional(
    { communityId: membership.communityId, profileId: membership.accountId, role },
    { metadata: membership.metadata },
  );
}

/** Serialize a {@link CommunityEvent} onto its wire shape. */
export function toEventWire(event: CommunityEvent): EventWire {
  const description =
    typeof event.metadata?.["description"] === "string"
      ? (event.metadata["description"] as string)
      : undefined;
  return withOptional(
    { id: event.id, communityId: event.communityId, title: event.title, startsAt: event.startsAt },
    { description, metadata: event.metadata },
  );
}

/** Serialize an {@link Rsvp} onto its wire shape. */
export function toRsvpWire(rsvp: Rsvp): RsvpWire {
  return withOptional(
    { eventId: rsvp.eventId, profileId: rsvp.accountId, status: rsvp.status },
    { metadata: rsvp.metadata },
  );
}

/** Serialize an in-app {@link InboxItem} onto the notification wire shape. */
export function toNotificationWire(
  accountId: string,
  item: InboxItem,
  index: number,
): NotificationWire {
  return {
    id: `ntf_${index.toString().padStart(4, "0")}`,
    accountId,
    kind: item.template,
    createdAt: item.deliveredAt,
    metadata: item.data,
  };
}

/** Validate that a decoded body is a JSON object, throwing VALIDATION otherwise. */
export function requireObject(value: unknown, field = "body"): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreError({
      code: ErrorCode.VALIDATION,
      message: `${field} must be a JSON object`,
    });
  }
  return value as Record<string, unknown>;
}

/** Read a required non-empty string field from a decoded body. */
export function requireString(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new CoreError({
      code: ErrorCode.VALIDATION,
      message: `${field} is required and must be a non-empty string`,
    });
  }
  return value;
}

/** Read an optional string field, validating its type when present. */
export function optionalString(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new CoreError({
      code: ErrorCode.VALIDATION,
      message: `${field} must be a string`,
    });
  }
  return value;
}

/** Read an optional metadata object, validating its type when present. */
export function optionalMetadata(
  body: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const value = body["metadata"];
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CoreError({
      code: ErrorCode.VALIDATION,
      message: "metadata must be a JSON object",
    });
  }
  return value as Record<string, unknown>;
}

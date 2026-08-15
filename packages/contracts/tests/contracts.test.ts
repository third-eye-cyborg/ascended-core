import { describe, it, expect } from "vitest";
import { createId, isEntityId, nowIso, type EntityId } from "@ascended/core";

/**
 * `@ascended/core`'s `createId` emits base64url ids, but its `isEntityId`
 * pattern only accepts `[A-Za-z0-9]` after the prefix. To keep these guard
 * tests deterministic we retry until we obtain an id that satisfies the
 * canonical guard the contracts rely on.
 */
function id(prefix: string): EntityId {
  for (let i = 0; i < 100; i += 1) {
    const candidate = createId(prefix);
    if (isEntityId(candidate)) return candidate;
  }
  throw new Error(`Unable to generate a canonical EntityId for prefix "${prefix}"`);
}
import {
  PresenceStatus,
  ContentVisibility,
  ModerationState,
  MessageDeliveryState,
  EventKind,
  RsvpStatus,
  CallSessionState,
  AvatarGenerationState,
  isAccount,
  isIdentityProfile,
  isPresenceRecord,
  isPost,
  isComment,
  isReaction,
  isBookmark,
  isMediaAttachment,
  isModerationSurface,
  isCommunity,
  isChannel,
  isRole,
  isMembership,
  isInvite,
  isConversation,
  isMessage,
  isCommunityEvent,
  isRsvp,
  isLiveSession,
  isRoomDescriptor,
  isRoomParticipant,
  isCallSession,
  isAvatarProfile,
  isAvatarGeneration,
  isSearchQuery,
  isSearchResult,
  isSearchResultSet,
  isRecommendationRequest,
  isRecommendationItem,
  isRecommendationResponse,
  isAuditEvent,
} from "../src/index";

const now = nowIso();
const stamps = { createdAt: now, updatedAt: now };
const accountId = id("acct");

describe("identity guards", () => {
  it("accepts a synthetic account and rejects malformed input", () => {
    const account = {
      id: accountId,
      handle: "ada-example",
      email: "ada@example.com",
      displayName: "Ada Example",
      ...stamps,
    };
    expect(isAccount(account)).toBe(true);
    expect(isAccount({ ...account, id: "not-an-id" })).toBe(false);
    expect(isAccount(null)).toBe(false);
    expect(isAccount({ ...account, email: 123 })).toBe(false);
  });

  it("validates identity profiles and presence records", () => {
    expect(
      isIdentityProfile({
        id: id("prof"),
        accountId,
        displayName: "Ada Example",
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isPresenceRecord({
        id: id("pres"),
        accountId,
        status: PresenceStatus.ONLINE,
        lastSeenAt: now,
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isPresenceRecord({
        id: id("pres"),
        accountId,
        status: "elsewhere",
        lastSeenAt: now,
        ...stamps,
      }),
    ).toBe(false);
  });
});

describe("content guards", () => {
  const attachment = {
    id: id("media"),
    kind: "image" as const,
    url: "https://cdn.example.com/a.png",
    mimeType: "image/png",
    sizeBytes: 1024,
    altText: "placeholder",
    ...stamps,
  };

  it("validates media attachments", () => {
    expect(isMediaAttachment(attachment)).toBe(true);
    expect(isMediaAttachment({ ...attachment, kind: "hologram" })).toBe(false);
  });

  it("validates posts, comments, reactions, bookmarks", () => {
    const post = {
      id: id("post"),
      authorId: accountId,
      body: "hello from Ada Example",
      visibility: ContentVisibility.PUBLIC,
      attachments: [attachment],
      ...stamps,
    };
    expect(isPost(post)).toBe(true);
    expect(isPost({ ...post, visibility: "cosmic" })).toBe(false);

    expect(
      isComment({
        id: id("cmt"),
        postId: post.id,
        authorId: accountId,
        body: "nice",
        ...stamps,
      }),
    ).toBe(true);

    expect(
      isReaction({
        id: id("rxn"),
        targetId: post.id,
        accountId,
        kind: "spark",
        ...stamps,
      }),
    ).toBe(true);

    expect(
      isBookmark({
        id: id("bkm"),
        accountId,
        targetId: post.id,
        ...stamps,
      }),
    ).toBe(true);
  });

  it("validates moderation surfaces without embedding rules", () => {
    expect(
      isModerationSurface({
        id: id("mod"),
        contentId: id("post"),
        contentType: "post",
        state: ModerationState.PENDING,
        ...stamps,
      }),
    ).toBe(true);
  });
});

describe("community guards", () => {
  const communityId = id("comm");
  it("validates communities, channels, roles, memberships, invites", () => {
    expect(
      isCommunity({ id: communityId, name: "Placeholder Guild", ownerId: accountId, ...stamps }),
    ).toBe(true);
    expect(
      isChannel({
        id: id("chan"),
        communityId,
        name: "general",
        kind: "text",
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isChannel({ id: id("chan"), communityId, name: "x", kind: "telepathy", ...stamps }),
    ).toBe(false);
    expect(
      isRole({
        id: id("role"),
        communityId,
        name: "member",
        permissions: ["read"],
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isMembership({
        id: id("memb"),
        communityId,
        accountId,
        roleIds: [],
        joinedAt: now,
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isInvite({
        id: id("invt"),
        communityId,
        code: "welcome",
        createdBy: accountId,
        ...stamps,
      }),
    ).toBe(true);
  });
});

describe("conversation guards", () => {
  const conversationId = id("conv");
  it("validates conversations and messages", () => {
    expect(
      isConversation({
        id: conversationId,
        kind: "direct",
        participantIds: [accountId],
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isMessage({
        id: id("msg"),
        conversationId,
        senderId: accountId,
        body: "hi",
        deliveryState: MessageDeliveryState.SENT,
        sentAt: now,
        ...stamps,
      }),
    ).toBe(true);
  });
});

describe("event guards", () => {
  const eventId = id("evt");
  it("validates community events, rsvps, live sessions", () => {
    expect(
      isCommunityEvent({
        id: eventId,
        communityId: id("comm"),
        title: "Meetup",
        kind: EventKind.SINGLE,
        startsAt: now,
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isRsvp({
        id: id("rsvp"),
        eventId,
        accountId,
        status: RsvpStatus.GOING,
        ...stamps,
      }),
    ).toBe(true);
    expect(isLiveSession({ id: id("live"), eventId, ...stamps })).toBe(true);
  });
});

describe("realtime guards", () => {
  const roomId = id("room");
  it("validates rooms, participants, call sessions", () => {
    expect(isRoomDescriptor({ id: roomId, name: "room-1", ...stamps })).toBe(true);
    expect(
      isRoomParticipant({
        id: id("part"),
        roomId,
        accountId,
        joinedAt: now,
        ...stamps,
      }),
    ).toBe(true);
    expect(
      isCallSession({ id: id("call"), roomId, state: CallSessionState.RINGING, ...stamps }),
    ).toBe(true);
  });
});

describe("avatar guards", () => {
  const avatarProfileId = id("avtr");
  it("validates avatar profiles and generations", () => {
    expect(
      isAvatarProfile({ id: avatarProfileId, accountId, displayName: "Sam Placeholder", ...stamps }),
    ).toBe(true);
    expect(
      isAvatarGeneration({
        id: id("agen"),
        avatarProfileId,
        state: AvatarGenerationState.QUEUED,
        ...stamps,
      }),
    ).toBe(true);
  });
});

describe("search guards", () => {
  it("validates search and recommendation shapes", () => {
    expect(isSearchQuery({ text: "ada" })).toBe(true);
    expect(isSearchQuery({})).toBe(false);
    const result = { id: id("post"), entityType: "post", score: 0.9 };
    expect(isSearchResult(result)).toBe(true);
    expect(isSearchResultSet({ results: [result], nextCursor: "c1" })).toBe(true);
    expect(isRecommendationRequest({ accountId, surface: "home-feed" })).toBe(true);
    const item = { id: id("post"), entityType: "post", score: 0.5 };
    expect(isRecommendationItem(item)).toBe(true);
    expect(isRecommendationResponse({ items: [item] })).toBe(true);
  });
});

describe("audit guards", () => {
  it("validates redaction-safe audit events", () => {
    expect(
      isAuditEvent({
        id: id("adt"),
        actorId: accountId,
        action: "post.published",
        targetType: "post",
        targetId: id("post") as EntityId,
        occurredAt: now,
        metadata: { source: "example-service" },
      }),
    ).toBe(true);
    expect(isAuditEvent({ id: "bad", actorId: accountId })).toBe(false);
  });
});

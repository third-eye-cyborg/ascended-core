import { describe, it, expect } from "vitest";
import { createId, nowIso, type EntityId, type IsoTimestamp } from "@ascended/core";
import {
  domainEventSchema,
  envelopeMetaSchema,
  EVENT_CATALOG,
  EVENT_TYPES,
  getCatalogEntry,
  type DomainEvent,
} from "../src/index";

const now = nowIso();

function baseEnvelope(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: createId("evt"),
    type: EVENT_TYPES.CONTENT_POST_PUBLISHED,
    version: 1,
    occurredAt: now,
    producer: "example-service",
    idempotencyKey: "key-1",
    payload: {
      postId: createId("post"),
      authorId: createId("acct"),
      publishedAt: now,
    },
    ...overrides,
  };
}

describe("envelope schema", () => {
  it("accepts a well-formed envelope with a valid payload", () => {
    const entry = EVENT_CATALOG[EVENT_TYPES.CONTENT_POST_PUBLISHED];
    const schema = domainEventSchema(entry.payloadSchema);
    const parsed = schema.safeParse(baseEnvelope());
    expect(parsed.success).toBe(true);
  });

  it("carries and validates the version field", () => {
    const meta = envelopeMetaSchema.safeParse(baseEnvelope());
    expect(meta.success).toBe(true);
    if (meta.success) {
      expect(meta.data.version).toBe(1);
    }
    const badVersion = envelopeMetaSchema.safeParse(baseEnvelope({ version: -1 }));
    expect(badVersion.success).toBe(false);
  });

  it("rejects a bad payload for a known event type", () => {
    const entry = EVENT_CATALOG[EVENT_TYPES.CONTENT_POST_PUBLISHED];
    const schema = domainEventSchema(entry.payloadSchema);
    const bad = baseEnvelope({ payload: { postId: 123 } as unknown as DomainEvent["payload"] });
    expect(schema.safeParse(bad).success).toBe(false);
  });

  it("rejects envelopes missing required meta fields", () => {
    const { idempotencyKey: _omit, ...rest } = baseEnvelope();
    void _omit;
    expect(envelopeMetaSchema.safeParse(rest).success).toBe(false);
  });
});

describe("catalog", () => {
  it("declares exactly the ten canonical event types with versions and schemas", () => {
    const expected = [
      "identity.profile_created",
      "content.post_published",
      "community.member_joined",
      "conversation.message_sent",
      "event.rsvp_confirmed",
      "realtime.room_joined",
      "media.asset_uploaded",
      "notification.requested",
      "recommendation.generated",
      "moderation.review_requested",
    ].sort();
    expect(Object.values(EVENT_TYPES).sort()).toEqual(expected);
    for (const type of Object.values(EVENT_TYPES)) {
      const entry = getCatalogEntry(type);
      expect(entry).toBeDefined();
      expect(entry?.version).toBeGreaterThanOrEqual(1);
      expect(entry?.type).toBe(type);
    }
  });

  it("returns undefined for unknown event types", () => {
    expect(getCatalogEntry("does.not_exist")).toBeUndefined();
  });

  it("validates a synthetic payload for every catalog entry", () => {
    const acct = createId("acct") as EntityId;
    const stamp = now as IsoTimestamp;
    const samples: Record<string, Record<string, unknown>> = {
      "identity.profile_created": { accountId: acct, profileId: createId("prof"), createdAt: stamp },
      "content.post_published": { postId: createId("post"), authorId: acct, publishedAt: stamp },
      "community.member_joined": {
        communityId: createId("comm"),
        accountId: acct,
        membershipId: createId("memb"),
        joinedAt: stamp,
      },
      "conversation.message_sent": {
        conversationId: createId("conv"),
        messageId: createId("msg"),
        senderId: acct,
        sentAt: stamp,
      },
      "event.rsvp_confirmed": {
        eventId: createId("evt"),
        rsvpId: createId("rsvp"),
        accountId: acct,
        confirmedAt: stamp,
      },
      "realtime.room_joined": {
        roomId: createId("room"),
        participantId: createId("part"),
        accountId: acct,
        joinedAt: stamp,
      },
      "media.asset_uploaded": { assetId: createId("media"), ownerId: acct, uploadedAt: stamp },
      "notification.requested": {
        notificationId: createId("noti"),
        recipientId: acct,
        requestedAt: stamp,
      },
      "recommendation.generated": {
        requestId: createId("recq"),
        accountId: acct,
        generatedAt: stamp,
      },
      "moderation.review_requested": {
        surfaceId: createId("mod"),
        contentId: createId("post"),
        requestedAt: stamp,
      },
    };
    for (const [type, payload] of Object.entries(samples)) {
      const entry = getCatalogEntry(type);
      expect(entry).toBeDefined();
      expect(entry?.payloadSchema.safeParse(payload).success).toBe(true);
    }
  });
});

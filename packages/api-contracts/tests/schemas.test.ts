import { describe, expect, it } from "vitest";

import {
  CommunityCreateSchema,
  CommunityPageSchema,
  CommunitySchema,
  ErrorSchema,
  EventPageSchema,
  EventSchema,
  HealthSchema,
  MembershipSchema,
  NotificationPageSchema,
  NotificationSchema,
  PostCreateSchema,
  PostPageSchema,
  PostSchema,
  ProfileSchema,
  ProfileUpdateSchema,
  ReactionCreateSchema,
  ReactionSchema,
  RsvpCreateSchema,
  RsvpSchema,
} from "../src/schemas.js";

describe("zod schema round-trips", () => {
  it("Health", () => {
    const payload = { status: "ok" as const, version: "0.1.0" };
    expect(HealthSchema.parse(payload)).toEqual(payload);
  });

  it("Error", () => {
    const payload = {
      error: "not_found",
      message: "Resource not found.",
      code: "NOT_FOUND",
    };
    expect(ErrorSchema.parse(payload)).toEqual(payload);
  });

  it("Profile and ProfileUpdate", () => {
    const profile = {
      id: "prof_AdaExample000001",
      accountId: "acct_AdaExample00001",
      displayName: "Ada Example",
      bio: "Curious about community software.",
      avatarUrl: "https://example.org/avatars/ada.png",
      metadata: { theme: "aurora" },
    };
    expect(ProfileSchema.parse(profile)).toEqual(profile);

    const update = { displayName: "Ada Example", bio: "Updated bio." };
    expect(ProfileUpdateSchema.parse(update)).toEqual(update);
  });

  it("Post, PostCreate and PostPage", () => {
    const post = {
      id: "post_AdaExample000001",
      authorId: "prof_AdaExample000001",
      content: "Hello from the reference API.",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(PostSchema.parse(post)).toEqual(post);

    const create = { content: "Hello again." };
    expect(PostCreateSchema.parse(create)).toEqual(create);

    const page = { items: [post], nextCursor: "cursor_abc" };
    expect(PostPageSchema.parse(page)).toEqual(page);
  });

  it("Reaction and ReactionCreate", () => {
    const reaction = {
      id: "reac_AdaExample000001",
      postId: "post_AdaExample000001",
      profileId: "prof_AdaExample000001",
      kind: "spark",
    };
    expect(ReactionSchema.parse(reaction)).toEqual(reaction);
    expect(ReactionCreateSchema.parse({ kind: "spark" })).toEqual({
      kind: "spark",
    });
  });

  it("Community, CommunityCreate and CommunityPage", () => {
    const community = {
      id: "comm_AdaExample000001",
      name: "Community Gardeners",
      description: "A synthetic example community.",
    };
    expect(CommunitySchema.parse(community)).toEqual(community);
    expect(
      CommunityCreateSchema.parse({ name: "Community Gardeners" }),
    ).toEqual({ name: "Community Gardeners" });
    const page = { items: [community] };
    expect(CommunityPageSchema.parse(page)).toEqual(page);
  });

  it("Membership", () => {
    const membership = {
      communityId: "comm_AdaExample000001",
      profileId: "prof_AdaExample000001",
      role: "member" as const,
    };
    expect(MembershipSchema.parse(membership)).toEqual(membership);
  });

  it("Event and EventPage", () => {
    const event = {
      id: "evnt_AdaExample000001",
      title: "Reference Meetup",
      startsAt: "2024-06-01T18:00:00.000Z",
    };
    expect(EventSchema.parse(event)).toEqual(event);
    const page = { items: [event], nextCursor: "cursor_next" };
    expect(EventPageSchema.parse(page)).toEqual(page);
  });

  it("Rsvp and RsvpCreate", () => {
    const rsvp = {
      eventId: "evnt_AdaExample000001",
      profileId: "prof_AdaExample000001",
      status: "going" as const,
    };
    expect(RsvpSchema.parse(rsvp)).toEqual(rsvp);
    expect(RsvpCreateSchema.parse({ status: "maybe" })).toEqual({
      status: "maybe",
    });
  });

  it("Notification and NotificationPage", () => {
    const notification = {
      id: "noti_AdaExample000001",
      accountId: "acct_AdaExample00001",
      kind: "mention",
      createdAt: "2024-01-02T00:00:00.000Z",
    };
    expect(NotificationSchema.parse(notification)).toEqual(notification);
    const page = { items: [notification] };
    expect(NotificationPageSchema.parse(page)).toEqual(page);
  });

  it("rejects invalid payloads", () => {
    expect(() => ProfileSchema.parse({ id: "x" })).toThrow();
    expect(() => RsvpCreateSchema.parse({ status: "nope" })).toThrow();
    expect(() =>
      PostSchema.parse({
        id: "post_1",
        authorId: "prof_1",
        content: "hi",
        createdAt: "not-a-date",
      }),
    ).toThrow();
  });
});

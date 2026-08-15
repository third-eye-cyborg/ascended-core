/**
 * Hand-maintained Zod schemas that mirror every component schema and request
 * body in {@link ../spec/openapi.yaml}. These schemas are the validation
 * source of truth for both the contract and the SDK. The drift check
 * (see {@link ./drift-check.ts}) asserts that this file and the OpenAPI
 * document stay aligned.
 *
 * All examples use synthetic data only (Ada Example, example.org).
 */

import { z } from "zod";

/** Free-form JSON-serializable extension metadata. */
export const MetadataSchema: z.ZodType<Record<string, unknown>> = z
  .record(z.string(), z.unknown());

export const HealthSchema = z.object({
  status: z.literal("ok"),
  version: z.string().optional(),
});
export type Health = z.infer<typeof HealthSchema>;

export const ErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
});
export type ApiErrorBody = z.infer<typeof ErrorSchema>;

export const ProfileSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  displayName: z.string(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  metadata: MetadataSchema.optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ProfileUpdateSchema = z.object({
  displayName: z.string().optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  metadata: MetadataSchema.optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export const PostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  communityId: z.string().optional(),
  content: z.string(),
  createdAt: z.string().datetime(),
  metadata: MetadataSchema.optional(),
});
export type Post = z.infer<typeof PostSchema>;

export const PostCreateSchema = z.object({
  content: z.string(),
  communityId: z.string().optional(),
  metadata: MetadataSchema.optional(),
});
export type PostCreate = z.infer<typeof PostCreateSchema>;

export const PostPageSchema = z.object({
  items: z.array(PostSchema),
  nextCursor: z.string().optional(),
});
export type PostPage = z.infer<typeof PostPageSchema>;

export const ReactionSchema = z.object({
  id: z.string(),
  postId: z.string(),
  profileId: z.string(),
  kind: z.string(),
  metadata: MetadataSchema.optional(),
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const ReactionCreateSchema = z.object({
  kind: z.string(),
  metadata: MetadataSchema.optional(),
});
export type ReactionCreate = z.infer<typeof ReactionCreateSchema>;

export const CommunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: MetadataSchema.optional(),
});
export type Community = z.infer<typeof CommunitySchema>;

export const CommunityCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  metadata: MetadataSchema.optional(),
});
export type CommunityCreate = z.infer<typeof CommunityCreateSchema>;

export const CommunityPageSchema = z.object({
  items: z.array(CommunitySchema),
  nextCursor: z.string().optional(),
});
export type CommunityPage = z.infer<typeof CommunityPageSchema>;

export const MembershipSchema = z.object({
  communityId: z.string(),
  profileId: z.string(),
  role: z.enum(["member", "moderator", "owner"]),
  metadata: MetadataSchema.optional(),
});
export type Membership = z.infer<typeof MembershipSchema>;

export const EventSchema = z.object({
  id: z.string(),
  communityId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  startsAt: z.string().datetime(),
  metadata: MetadataSchema.optional(),
});
export type Event = z.infer<typeof EventSchema>;

export const EventPageSchema = z.object({
  items: z.array(EventSchema),
  nextCursor: z.string().optional(),
});
export type EventPage = z.infer<typeof EventPageSchema>;

export const RsvpCreateSchema = z.object({
  status: z.enum(["going", "maybe", "declined"]),
  metadata: MetadataSchema.optional(),
});
export type RsvpCreate = z.infer<typeof RsvpCreateSchema>;

export const RsvpSchema = z.object({
  eventId: z.string(),
  profileId: z.string(),
  status: z.enum(["going", "maybe", "declined"]),
  metadata: MetadataSchema.optional(),
});
export type Rsvp = z.infer<typeof RsvpSchema>;

export const NotificationSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  kind: z.string(),
  readAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  metadata: MetadataSchema.optional(),
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationPageSchema = z.object({
  items: z.array(NotificationSchema),
  nextCursor: z.string().optional(),
});
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

/**
 * Registry of every exported component schema keyed by its OpenAPI
 * `components.schemas` name. The drift check consumes this to verify that the
 * spec and this module have matching schema coverage.
 */
export const componentSchemas = {
  Metadata: MetadataSchema,
  Health: HealthSchema,
  Error: ErrorSchema,
  Profile: ProfileSchema,
  ProfileUpdate: ProfileUpdateSchema,
  Post: PostSchema,
  PostCreate: PostCreateSchema,
  PostPage: PostPageSchema,
  Reaction: ReactionSchema,
  ReactionCreate: ReactionCreateSchema,
  Community: CommunitySchema,
  CommunityCreate: CommunityCreateSchema,
  CommunityPage: CommunityPageSchema,
  Membership: MembershipSchema,
  Event: EventSchema,
  EventPage: EventPageSchema,
  RsvpCreate: RsvpCreateSchema,
  Rsvp: RsvpSchema,
  Notification: NotificationSchema,
  NotificationPage: NotificationPageSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

/** Union of known component schema names. */
export type ComponentSchemaName = keyof typeof componentSchemas;

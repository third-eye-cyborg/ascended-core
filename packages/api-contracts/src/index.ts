/**
 * Public entry point for the Ascended Core Reference API contract package.
 *
 * Re-exports the hand-maintained Zod schemas plus a typed {@link OperationCatalog}
 * that maps every OpenAPI `operationId` to its HTTP method, path template, and
 * (where applicable) request/response Zod schemas.
 */

import type { z } from "zod";

import {
  CommunityCreateSchema,
  CommunityPageSchema,
  CommunitySchema,
  EventPageSchema,
  EventSchema,
  HealthSchema,
  MembershipSchema,
  NotificationPageSchema,
  PostCreateSchema,
  PostPageSchema,
  PostSchema,
  ProfileSchema,
  ProfileUpdateSchema,
  ReactionCreateSchema,
  ReactionSchema,
  RsvpCreateSchema,
  RsvpSchema,
} from "./schemas.js";

export * from "./schemas.js";
export { runDriftCheck } from "./drift-check.js";
export type { DriftCheckResult } from "./drift-check.js";

/** Supported HTTP methods for reference API operations. */
export type HttpMethod = "GET" | "PUT" | "POST" | "DELETE" | "PATCH";

/** A single reference API operation description. */
export interface OperationDescriptor {
  /** HTTP method. */
  readonly method: HttpMethod;
  /** Path template, e.g. `/posts/{postId}`. */
  readonly path: string;
  /** Whether the operation requires bearer authentication. */
  readonly requiresAuth: boolean;
  /** Zod schema for the JSON request body, when the operation has one. */
  readonly requestSchema?: z.ZodTypeAny;
  /** Zod schema for the successful JSON response body. */
  readonly responseSchema: z.ZodTypeAny;
}

/**
 * Typed catalog of every operation in the contract keyed by `operationId`.
 * The drift check verifies this stays in sync with the OpenAPI paths.
 */
export const OperationCatalog = {
  getHealthz: {
    method: "GET",
    path: "/healthz",
    requiresAuth: false,
    responseSchema: HealthSchema,
  },
  getMyProfile: {
    method: "GET",
    path: "/profiles/me",
    requiresAuth: true,
    responseSchema: ProfileSchema,
  },
  updateMyProfile: {
    method: "PUT",
    path: "/profiles/me",
    requiresAuth: true,
    requestSchema: ProfileUpdateSchema,
    responseSchema: ProfileSchema,
  },
  getProfile: {
    method: "GET",
    path: "/profiles/{profileId}",
    requiresAuth: true,
    responseSchema: ProfileSchema,
  },
  listPosts: {
    method: "GET",
    path: "/posts",
    requiresAuth: true,
    responseSchema: PostPageSchema,
  },
  createPost: {
    method: "POST",
    path: "/posts",
    requiresAuth: true,
    requestSchema: PostCreateSchema,
    responseSchema: PostSchema,
  },
  getPost: {
    method: "GET",
    path: "/posts/{postId}",
    requiresAuth: true,
    responseSchema: PostSchema,
  },
  addReaction: {
    method: "POST",
    path: "/posts/{postId}/reactions",
    requiresAuth: true,
    requestSchema: ReactionCreateSchema,
    responseSchema: ReactionSchema,
  },
  listCommunities: {
    method: "GET",
    path: "/communities",
    requiresAuth: true,
    responseSchema: CommunityPageSchema,
  },
  createCommunity: {
    method: "POST",
    path: "/communities",
    requiresAuth: true,
    requestSchema: CommunityCreateSchema,
    responseSchema: CommunitySchema,
  },
  getCommunity: {
    method: "GET",
    path: "/communities/{communityId}",
    requiresAuth: true,
    responseSchema: CommunitySchema,
  },
  joinCommunity: {
    method: "POST",
    path: "/communities/{communityId}/join",
    requiresAuth: true,
    responseSchema: MembershipSchema,
  },
  listEvents: {
    method: "GET",
    path: "/events",
    requiresAuth: true,
    responseSchema: EventPageSchema,
  },
  getEvent: {
    method: "GET",
    path: "/events/{eventId}",
    requiresAuth: true,
    responseSchema: EventSchema,
  },
  rsvpEvent: {
    method: "POST",
    path: "/events/{eventId}/rsvp",
    requiresAuth: true,
    requestSchema: RsvpCreateSchema,
    responseSchema: RsvpSchema,
  },
  listMyNotifications: {
    method: "GET",
    path: "/notifications/me",
    requiresAuth: true,
    responseSchema: NotificationPageSchema,
  },
} as const satisfies Record<string, OperationDescriptor>;

/** Union of all known operation ids. */
export type OperationId = keyof typeof OperationCatalog;

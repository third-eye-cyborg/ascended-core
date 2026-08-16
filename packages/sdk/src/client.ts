/**
 * Hand-curated TypeScript client for the Ascended Core Reference API.
 *
 * The client exposes one typed method per operation in the contract's
 * {@link OperationCatalog}. Responses are validated against the contract's Zod
 * schemas by default; validation failures surface as an {@link ApiError} with a
 * `VALIDATION` code so callers never receive silently malformed data.
 */

import { ErrorCode } from "@third-eye-cyborg/ascended-core";
import {
  CommunityPageSchema,
  CommunitySchema,
  EventPageSchema,
  EventSchema,
  HealthSchema,
  MembershipSchema,
  NotificationPageSchema,
  PostPageSchema,
  PostSchema,
  ProfileSchema,
  ReactionSchema,
  RsvpSchema,
} from "@third-eye-cyborg/ascended-api-contracts";
import type {
  Community,
  CommunityCreate,
  CommunityPage,
  Event as ApiEvent,
  EventPage,
  Health,
  Membership,
  NotificationPage,
  Post,
  PostCreate,
  PostPage,
  Profile,
  ProfileUpdate,
  Reaction,
  ReactionCreate,
  Rsvp,
  RsvpCreate,
} from "@third-eye-cyborg/ascended-api-contracts";
import type { z } from "zod";

import { ApiError } from "./errors.js";

/** A fetch-compatible function. Defaults to the global `fetch`. */
export type FetchImpl = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/** Options accepted by {@link AscendedCoreClient}. */
export interface AscendedCoreClientOptions {
  /** Base URL of the API, e.g. `https://api.example.org`. */
  baseUrl: string;
  /** Optional bearer token used for authenticated operations. */
  apiKey?: string;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetchImpl?: FetchImpl;
  /** Validate responses against the contract's Zod schemas. Default: true. */
  validateResponses?: boolean;
}

/** Common query options for list operations. */
export interface ListOptions {
  cursor?: string;
  limit?: number;
}

interface RequestOptions {
  method: string;
  path: string;
  requiresAuth: boolean;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export class AscendedCoreClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly fetchImpl: FetchImpl;
  private readonly validateResponses: boolean;

  constructor(options: AscendedCoreClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.validateResponses = options.validateResponses ?? true;

    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new ApiError({
        code: ErrorCode.UNSUPPORTED,
        message:
          "No fetch implementation available. Provide options.fetchImpl or run on a platform with a global fetch.",
      });
    }
    // Bind to preserve `this` when using the global fetch.
    this.fetchImpl = fetchImpl.bind(globalThis) as FetchImpl;
  }

  // --- system -------------------------------------------------------------

  async getHealthz(): Promise<Health> {
    return this.request(
      { method: "GET", path: "/healthz", requiresAuth: false },
      HealthSchema,
    );
  }

  // --- profiles -----------------------------------------------------------

  async getMyProfile(): Promise<Profile> {
    return this.request(
      { method: "GET", path: "/profiles/me", requiresAuth: true },
      ProfileSchema,
    );
  }

  async updateMyProfile(body: ProfileUpdate): Promise<Profile> {
    return this.request(
      { method: "PUT", path: "/profiles/me", requiresAuth: true, body },
      ProfileSchema,
    );
  }

  async getProfile(profileId: string): Promise<Profile> {
    return this.request(
      {
        method: "GET",
        path: `/profiles/${encodeURIComponent(profileId)}`,
        requiresAuth: true,
      },
      ProfileSchema,
    );
  }

  // --- posts --------------------------------------------------------------

  async listPosts(options: ListOptions = {}): Promise<PostPage> {
    return this.request(
      {
        method: "GET",
        path: "/posts",
        requiresAuth: true,
        query: { cursor: options.cursor, limit: options.limit },
      },
      PostPageSchema,
    );
  }

  async createPost(body: PostCreate): Promise<Post> {
    return this.request(
      { method: "POST", path: "/posts", requiresAuth: true, body },
      PostSchema,
    );
  }

  async getPost(postId: string): Promise<Post> {
    return this.request(
      {
        method: "GET",
        path: `/posts/${encodeURIComponent(postId)}`,
        requiresAuth: true,
      },
      PostSchema,
    );
  }

  async addReaction(postId: string, body: ReactionCreate): Promise<Reaction> {
    return this.request(
      {
        method: "POST",
        path: `/posts/${encodeURIComponent(postId)}/reactions`,
        requiresAuth: true,
        body,
      },
      ReactionSchema,
    );
  }

  // --- communities --------------------------------------------------------

  async listCommunities(options: ListOptions = {}): Promise<CommunityPage> {
    return this.request(
      {
        method: "GET",
        path: "/communities",
        requiresAuth: true,
        query: { cursor: options.cursor, limit: options.limit },
      },
      CommunityPageSchema,
    );
  }

  async createCommunity(body: CommunityCreate): Promise<Community> {
    return this.request(
      { method: "POST", path: "/communities", requiresAuth: true, body },
      CommunitySchema,
    );
  }

  async getCommunity(communityId: string): Promise<Community> {
    return this.request(
      {
        method: "GET",
        path: `/communities/${encodeURIComponent(communityId)}`,
        requiresAuth: true,
      },
      CommunitySchema,
    );
  }

  async joinCommunity(communityId: string): Promise<Membership> {
    return this.request(
      {
        method: "POST",
        path: `/communities/${encodeURIComponent(communityId)}/join`,
        requiresAuth: true,
      },
      MembershipSchema,
    );
  }

  // --- events -------------------------------------------------------------

  async listEvents(options: ListOptions = {}): Promise<EventPage> {
    return this.request(
      {
        method: "GET",
        path: "/events",
        requiresAuth: true,
        query: { cursor: options.cursor, limit: options.limit },
      },
      EventPageSchema,
    );
  }

  async getEvent(eventId: string): Promise<ApiEvent> {
    return this.request(
      {
        method: "GET",
        path: `/events/${encodeURIComponent(eventId)}`,
        requiresAuth: true,
      },
      EventSchema,
    );
  }

  async rsvpEvent(eventId: string, body: RsvpCreate): Promise<Rsvp> {
    return this.request(
      {
        method: "POST",
        path: `/events/${encodeURIComponent(eventId)}/rsvp`,
        requiresAuth: true,
        body,
      },
      RsvpSchema,
    );
  }

  // --- notifications ------------------------------------------------------

  async listMyNotifications(
    options: ListOptions = {},
  ): Promise<NotificationPage> {
    return this.request(
      {
        method: "GET",
        path: "/notifications/me",
        requiresAuth: true,
        query: { cursor: options.cursor, limit: options.limit },
      },
      NotificationPageSchema,
    );
  }

  // --- internals ----------------------------------------------------------

  private buildUrl(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): string {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  private async request<T>(
    options: RequestOptions,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const url = this.buildUrl(options.path, options.query);

    const headers: Record<string, string> = { accept: "application/json" };
    if (options.requiresAuth) {
      if (this.apiKey === undefined || this.apiKey === "") {
        throw new ApiError({
          code: ErrorCode.UNAUTHORIZED,
          message: `Operation ${options.method} ${options.path} requires an apiKey but none was provided.`,
          statusCode: 401,
        });
      }
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const init: RequestInit = {
      method: options.method,
      headers,
    };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (cause) {
      throw new ApiError({
        code: ErrorCode.UNAVAILABLE,
        message: `Network request failed for ${options.method} ${options.path}.`,
        cause,
        context: { path: options.path, method: options.method },
      });
    }

    if (!response.ok) {
      throw await this.toApiError(response, options);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new ApiError({
        code: ErrorCode.PROVIDER_ERROR,
        message: `Failed to parse JSON response for ${options.method} ${options.path}.`,
        statusCode: response.status,
        cause,
      });
    }

    if (!this.validateResponses) {
      return payload as T;
    }

    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new ApiError({
        code: ErrorCode.VALIDATION,
        message: `Response validation failed for ${options.method} ${options.path}.`,
        statusCode: response.status,
        context: { issues: result.error.issues },
      });
    }
    return result.data;
  }

  private async toApiError(
    response: Response,
    options: RequestOptions,
  ): Promise<ApiError> {
    let message = `Request ${options.method} ${options.path} failed with status ${response.status}.`;
    let code: string | undefined;
    try {
      const body = (await response.json()) as {
        message?: unknown;
        error?: unknown;
        code?: unknown;
      };
      if (typeof body.message === "string") message = body.message;
      else if (typeof body.error === "string") message = body.error;
      if (typeof body.code === "string") code = body.code;
    } catch {
      // Ignore body parse failures; fall back to the status-based message.
    }
    return new ApiError({
      ...(code !== undefined ? { code } : {}),
      message,
      statusCode: response.status,
      context: { path: options.path, method: options.method },
    });
  }
}

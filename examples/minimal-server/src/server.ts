/**
 * A runnable reference API server built on `node:http` with zero external
 * runtime dependencies. It wires the workspace's local in-memory adapters and
 * exposes the reference contract: profiles, posts, reactions, communities,
 * events, and notifications with cursor pagination and bearer auth.
 *
 * Every mutation publishes the matching domain event through the in-memory bus
 * so downstream consumers (and tests) can observe the workflow.
 */

import { createServer as createHttpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import {
  CoreError,
  ErrorCode,
  createId,
  nowIso,
  type EntityId,
} from "@third-eye-cyborg/ascended-core";
import {
  ContentVisibility,
  EventKind,
  RsvpStatus,
  type Community,
  type CommunityEvent,
  type IdentityProfile,
  type Membership,
  type Post,
  type Reaction,
  type Rsvp,
} from "@third-eye-cyborg/ascended-contracts";
import { EVENT_TYPES } from "@third-eye-cyborg/ascended-events";
import type { DomainEvent } from "@third-eye-cyborg/ascended-events";
import { NotificationChannel } from "@third-eye-cyborg/ascended-notifications";

import { createPlatform, type Platform } from "./store.js";
import {
  optionalMetadata,
  optionalString,
  requireObject,
  requireString,
  toCommunityWire,
  toEventWire,
  toMembershipWire,
  toNotificationWire,
  toPostWire,
  toProfileWire,
  toReactionWire,
  toRsvpWire,
  type ErrorWire,
  type PageWire,
} from "./wire.js";

/** Options accepted by {@link createServer}. */
export interface CreateServerOptions {
  /** Port to listen on. Use `0` for an ephemeral port. Defaults to `0`. */
  port?: number;
  /** Host to bind. Defaults to `127.0.0.1`. */
  host?: string;
  /** Reported API version string. */
  version?: string;
  /** Inject a pre-built platform (tests may share state). */
  platform?: Platform;
}

/** A running reference server plus handles for tests and demos. */
export interface RunningServer {
  /** The underlying Node HTTP server. */
  readonly http: Server;
  /** The composed local platform (repositories, adapters, bus). */
  readonly platform: Platform;
  /** Resolved base URL once listening, e.g. `http://127.0.0.1:53421`. */
  readonly baseUrl: string;
  /** Bound port. */
  readonly port: number;
  /** Start listening; resolves once bound. */
  listen(): Promise<RunningServer>;
  /** Stop listening; resolves once closed. */
  close(): Promise<void>;
}

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

/**
 * Build (but do not start) a reference server. Call {@link RunningServer.listen}
 * to begin accepting connections.
 */
export function createServer(options: CreateServerOptions = {}): RunningServer {
  const platform = options.platform ?? createPlatform();
  const host = options.host ?? "127.0.0.1";
  const version = options.version ?? "0.1.0";
  const requestedPort = options.port ?? 0;

  const http = createHttpServer((req, res) => {
    void handle(req, res, platform, version).catch((error) => {
      writeError(res, error);
    });
  });

  const server: RunningServer = {
    http,
    platform,
    get baseUrl() {
      const address = http.address();
      if (address && typeof address === "object") {
        const info = address as AddressInfo;
        return `http://${host}:${info.port}`;
      }
      return `http://${host}:${requestedPort}`;
    },
    get port() {
      const address = http.address();
      return address && typeof address === "object" ? (address as AddressInfo).port : requestedPort;
    },
    listen(): Promise<RunningServer> {
      return new Promise((resolve, reject) => {
        http.once("error", reject);
        http.listen(requestedPort, host, () => {
          http.removeListener("error", reject);
          resolve(server);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        http.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };

  return server;
}

interface RequestContext {
  readonly method: string;
  readonly url: URL;
  readonly accountId: EntityId;
  readonly body: unknown;
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  platform: Platform,
  version: string,
): Promise<void> {
  const method = (req.method ?? "GET").toUpperCase();
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  platform.metrics.increment("http.request", { method, path: routeLabel(path) });

  // Health check is public.
  if (method === "GET" && path === "/healthz") {
    writeJson(res, 200, { status: "ok", version });
    return;
  }

  const accountId = authenticate(req, platform);
  const body = await readBody(req);
  const ctx: RequestContext = { method, url, accountId, body };

  const result = await route(path, ctx, platform);
  writeJson(res, result.status, result.body);
}

interface RouteResult {
  status: number;
  body: unknown;
}

async function route(
  path: string,
  ctx: RequestContext,
  platform: Platform,
): Promise<RouteResult> {
  // /profiles/me
  if (path === "/profiles/me") {
    if (ctx.method === "GET") return getMyProfile(ctx, platform);
    if (ctx.method === "PUT") return putMyProfile(ctx, platform);
    throw methodNotAllowed();
  }

  // /profiles/:id
  const profileMatch = matchPath(path, "/profiles/");
  if (profileMatch !== undefined) {
    if (ctx.method === "GET") return getProfile(profileMatch, platform);
    throw methodNotAllowed();
  }

  // /posts and /posts/:id and /posts/:id/reactions
  if (path === "/posts") {
    if (ctx.method === "GET") return listPosts(ctx, platform);
    if (ctx.method === "POST") return createPost(ctx, platform);
    throw methodNotAllowed();
  }
  const postReactions = matchNested(path, "/posts/", "/reactions");
  if (postReactions !== undefined) {
    if (ctx.method === "POST") return addReaction(postReactions, ctx, platform);
    throw methodNotAllowed();
  }
  const postMatch = matchPath(path, "/posts/");
  if (postMatch !== undefined) {
    if (ctx.method === "GET") return getPost(postMatch, platform);
    throw methodNotAllowed();
  }

  // /communities and /communities/:id/join
  if (path === "/communities") {
    if (ctx.method === "GET") return listCommunities(ctx, platform);
    if (ctx.method === "POST") return createCommunity(ctx, platform);
    throw methodNotAllowed();
  }
  const communityJoin = matchNested(path, "/communities/", "/join");
  if (communityJoin !== undefined) {
    if (ctx.method === "POST") return joinCommunity(communityJoin, ctx, platform);
    throw methodNotAllowed();
  }

  // /events and /events/:id/rsvp
  if (path === "/events") {
    if (ctx.method === "GET") return listEvents(ctx, platform);
    if (ctx.method === "POST") return createEvent(ctx, platform);
    throw methodNotAllowed();
  }
  const eventRsvp = matchNested(path, "/events/", "/rsvp");
  if (eventRsvp !== undefined) {
    if (ctx.method === "POST") return rsvpEvent(eventRsvp, ctx, platform);
    throw methodNotAllowed();
  }

  // /notifications/me
  if (path === "/notifications/me") {
    if (ctx.method === "GET") return listMyNotifications(ctx, platform);
    throw methodNotAllowed();
  }

  throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `no route for ${path}` });
}

/* -------------------------------------------------------------------------- */
/* Handlers                                                                   */
/* -------------------------------------------------------------------------- */

async function getMyProfile(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const profile = await ensureProfile(ctx.accountId, platform);
  return { status: 200, body: toProfileWire(profile) };
}

async function putMyProfile(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const body = requireObject(ctx.body);
  const displayName = optionalString(body, "displayName");
  const bio = optionalString(body, "bio");
  const avatarUrl = optionalString(body, "avatarUrl");
  const metadata = optionalMetadata(body);

  const existing = await ensureProfile(ctx.accountId, platform);
  const patch: Partial<IdentityProfile> = { updatedAt: nowIso() };
  if (displayName !== undefined) patch.displayName = displayName;
  if (bio !== undefined) patch.bio = bio;
  if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;
  if (metadata !== undefined) patch.metadata = metadata;

  const updated = await platform.profiles.update(existing.id, patch);
  return { status: 200, body: toProfileWire(updated) };
}

async function getProfile(profileId: string, platform: Platform): Promise<RouteResult> {
  const profile = await platform.profiles.findById(profileId as EntityId);
  if (profile === null) {
    throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `profile not found: ${profileId}` });
  }
  return { status: 200, body: toProfileWire(profile) };
}

async function listPosts(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const page = await platform.posts.findMany(undefined, pagination(ctx.url));
  const body: PageWire<ReturnType<typeof toPostWire>> = { items: page.items.map(toPostWire) };
  if (page.nextCursor !== undefined) body.nextCursor = page.nextCursor;
  return { status: 200, body };
}

async function createPost(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const body = requireObject(ctx.body);
  const content = requireString(body, "content");
  const communityId = optionalString(body, "communityId");
  const metadata = optionalMetadata(body) ?? {};
  if (communityId !== undefined) metadata["communityId"] = communityId;

  const now = nowIso();
  const post: Post = {
    id: createId("post"),
    authorId: ctx.accountId,
    body: content,
    visibility: ContentVisibility.PUBLIC,
    createdAt: now,
    updatedAt: now,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
  const created = await platform.posts.create(post);

  await publish(platform, EVENT_TYPES.CONTENT_POST_PUBLISHED, {
    postId: created.id,
    authorId: created.authorId,
    publishedAt: now,
  });

  return { status: 201, body: toPostWire(created) };
}

async function getPost(postId: string, platform: Platform): Promise<RouteResult> {
  const post = await platform.posts.findById(postId as EntityId);
  if (post === null) {
    throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `post not found: ${postId}` });
  }
  return { status: 200, body: toPostWire(post) };
}

async function addReaction(
  postId: string,
  ctx: RequestContext,
  platform: Platform,
): Promise<RouteResult> {
  const post = await platform.posts.findById(postId as EntityId);
  if (post === null) {
    throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `post not found: ${postId}` });
  }
  const body = requireObject(ctx.body);
  const kind = requireString(body, "kind");
  const metadata = optionalMetadata(body);

  const now = nowIso();
  const reaction: Reaction = {
    id: createId("react"),
    targetId: post.id,
    accountId: ctx.accountId,
    kind,
    createdAt: now,
    updatedAt: now,
    ...(metadata !== undefined ? { metadata } : {}),
  };
  const created = await platform.reactions.create(reaction);

  // Notify the post author that their content was reacted to.
  await platform.notifications.notify({
    recipientAccountId: post.authorId,
    template: "post.reaction",
    data: { postId: post.id, kind },
    channels: [NotificationChannel.IN_APP],
  });

  return { status: 201, body: toReactionWire(created) };
}

async function listCommunities(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const page = await platform.communities.findMany(undefined, pagination(ctx.url));
  const body: PageWire<ReturnType<typeof toCommunityWire>> = {
    items: page.items.map(toCommunityWire),
  };
  if (page.nextCursor !== undefined) body.nextCursor = page.nextCursor;
  return { status: 200, body };
}

async function createCommunity(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const body = requireObject(ctx.body);
  const name = requireString(body, "name");
  const description = optionalString(body, "description");
  const metadata = optionalMetadata(body);

  const now = nowIso();
  const community: Community = {
    id: createId("comm"),
    name,
    ownerId: ctx.accountId,
    createdAt: now,
    updatedAt: now,
    ...(description !== undefined ? { description } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
  const created = await platform.communities.create(community);
  return { status: 201, body: toCommunityWire(created) };
}

async function joinCommunity(
  communityId: string,
  ctx: RequestContext,
  platform: Platform,
): Promise<RouteResult> {
  const community = await platform.communities.findById(communityId as EntityId);
  if (community === null) {
    throw new CoreError({
      code: ErrorCode.NOT_FOUND,
      message: `community not found: ${communityId}`,
    });
  }

  const now = nowIso();
  const membership: Membership = {
    id: createId("mbr"),
    communityId: community.id,
    accountId: ctx.accountId,
    roleIds: [],
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    metadata: { role: "member" },
  };
  const created = await platform.memberships.create(membership);

  await publish(platform, EVENT_TYPES.COMMUNITY_MEMBER_JOINED, {
    communityId: community.id,
    accountId: ctx.accountId,
    membershipId: created.id,
    joinedAt: now,
  });

  return { status: 201, body: toMembershipWire(created) };
}

async function listEvents(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const page = await platform.events.findMany(undefined, pagination(ctx.url));
  const body: PageWire<ReturnType<typeof toEventWire>> = { items: page.items.map(toEventWire) };
  if (page.nextCursor !== undefined) body.nextCursor = page.nextCursor;
  return { status: 200, body };
}

async function createEvent(ctx: RequestContext, platform: Platform): Promise<RouteResult> {
  const body = requireObject(ctx.body);
  const title = requireString(body, "title");
  const startsAt = requireString(body, "startsAt");
  const communityId = optionalString(body, "communityId");
  const description = optionalString(body, "description");
  const metadata = optionalMetadata(body) ?? {};
  if (description !== undefined) metadata["description"] = description;

  const now = nowIso();
  const event: CommunityEvent = {
    id: createId("evt"),
    communityId: (communityId ?? ctx.accountId) as EntityId,
    title,
    kind: EventKind.SINGLE,
    startsAt: startsAt as CommunityEvent["startsAt"],
    createdAt: now,
    updatedAt: now,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
  const created = await platform.events.create(event);
  return { status: 201, body: toEventWire(created) };
}

async function rsvpEvent(
  eventId: string,
  ctx: RequestContext,
  platform: Platform,
): Promise<RouteResult> {
  const event = await platform.events.findById(eventId as EntityId);
  if (event === null) {
    throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `event not found: ${eventId}` });
  }
  const body = requireObject(ctx.body);
  const status = parseRsvpStatus(requireString(body, "status"));
  const metadata = optionalMetadata(body);

  const now = nowIso();
  const rsvp: Rsvp = {
    id: createId("rsvp"),
    eventId: event.id,
    accountId: ctx.accountId,
    status,
    createdAt: now,
    updatedAt: now,
    ...(metadata !== undefined ? { metadata } : {}),
  };
  const created = await platform.rsvps.create(rsvp);

  await publish(platform, EVENT_TYPES.EVENT_RSVP_CONFIRMED, {
    eventId: event.id,
    rsvpId: created.id,
    accountId: ctx.accountId,
    confirmedAt: now,
  });

  return { status: 201, body: toRsvpWire(created) };
}

async function listMyNotifications(
  ctx: RequestContext,
  platform: Platform,
): Promise<RouteResult> {
  const items = platform.inbox.list(ctx.accountId);
  const body: PageWire<ReturnType<typeof toNotificationWire>> = {
    items: items.map((item, index) => toNotificationWire(ctx.accountId, item, index)),
  };
  return { status: 200, body };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Resolve (or lazily create) the profile for an account. */
async function ensureProfile(accountId: EntityId, platform: Platform): Promise<IdentityProfile> {
  const existing = await platform.profiles.findMany({ accountId }, { limit: 1 });
  const found = existing.items[0];
  if (found !== undefined) return found;

  const now = nowIso();
  const profile: IdentityProfile = {
    id: createId("prof"),
    accountId,
    displayName: "New Member",
    createdAt: now,
    updatedAt: now,
  };
  const created = await platform.profiles.create(profile);

  await publish(platform, EVENT_TYPES.IDENTITY_PROFILE_CREATED, {
    accountId,
    profileId: created.id,
    createdAt: now,
  });

  return created;
}

async function publish(
  platform: Platform,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const event: DomainEvent<Record<string, unknown>> = {
    id: createId("evt"),
    type,
    version: 1,
    occurredAt: nowIso(),
    producer: "example-minimal-server",
    idempotencyKey: createId("idem"),
    payload,
  };
  await platform.bus.publish(event);
}

function authenticate(req: IncomingMessage, platform: Platform): EntityId {
  const header = req.headers["authorization"];
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw new CoreError({
      code: ErrorCode.UNAUTHORIZED,
      message: "missing bearer token",
    });
  }
  const token = header.slice("Bearer ".length).trim();
  const accountId = platform.resolveToken(token);
  if (accountId === null) {
    throw new CoreError({ code: ErrorCode.UNAUTHORIZED, message: "invalid bearer token" });
  }
  return accountId;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new CoreError({ code: ErrorCode.VALIDATION, message: "request body is not valid JSON" });
  }
}

function pagination(url: URL): { limit: number; cursor?: string } {
  const limitParam = url.searchParams.get("limit");
  let limit = DEFAULT_PAGE_LIMIT;
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new CoreError({ code: ErrorCode.VALIDATION, message: "limit must be a positive integer" });
    }
    limit = Math.min(parsed, MAX_PAGE_LIMIT);
  }
  const cursor = url.searchParams.get("cursor");
  return cursor !== null ? { limit, cursor } : { limit };
}

function parseRsvpStatus(value: string): RsvpStatus {
  switch (value) {
    case "going":
      return RsvpStatus.GOING;
    case "maybe":
      return RsvpStatus.MAYBE;
    case "declined":
      return RsvpStatus.DECLINED;
    default:
      throw new CoreError({
        code: ErrorCode.VALIDATION,
        message: "status must be one of: going, maybe, declined",
      });
  }
}

/** Match `/prefix/:id` and return the id segment, or `undefined`. */
function matchPath(path: string, prefix: string): string | undefined {
  if (!path.startsWith(prefix)) return undefined;
  const rest = path.slice(prefix.length);
  if (rest.length === 0 || rest.includes("/")) return undefined;
  return decodeURIComponent(rest);
}

/** Match `/prefix/:id/suffix` and return the id segment, or `undefined`. */
function matchNested(path: string, prefix: string, suffix: string): string | undefined {
  if (!path.startsWith(prefix) || !path.endsWith(suffix)) return undefined;
  const middle = path.slice(prefix.length, path.length - suffix.length);
  if (middle.length === 0 || middle.includes("/")) return undefined;
  return decodeURIComponent(middle);
}

/** Collapse dynamic path segments into a stable metric label. */
function routeLabel(path: string): string {
  return path
    .replace(/\/(profiles|posts|communities|events)\/[^/]+/g, "/$1/:id")
    .replace(/\/(posts|communities|events)\/:id\/(reactions|join|rsvp)/g, "/$1/:id/$2");
}

function methodNotAllowed(): CoreError {
  return new CoreError({
    code: ErrorCode.VALIDATION,
    message: "method not allowed",
    statusCode: 405,
  });
}

function statusForError(error: CoreError): number {
  if (error.statusCode !== undefined) return error.statusCode;
  switch (error.code) {
    case ErrorCode.VALIDATION:
      return 400;
    case ErrorCode.UNAUTHORIZED:
      return 401;
    case ErrorCode.FORBIDDEN:
    case ErrorCode.PRIVACY_BLOCKED:
      return 403;
    case ErrorCode.NOT_FOUND:
      return 404;
    case ErrorCode.CONFLICT:
      return 409;
    case ErrorCode.RATE_LIMITED:
      return 429;
    default:
      return 500;
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload).toString(),
  });
  res.end(payload);
}

function writeError(res: ServerResponse, error: unknown): void {
  const coreError = CoreError.isCoreError(error)
    ? error
    : new CoreError({
        code: ErrorCode.UNKNOWN,
        message: error instanceof Error ? error.message : "internal error",
      });
  const status = statusForError(coreError);
  const body: ErrorWire = {
    error: String(coreError.code),
    message: coreError.message,
    code: String(coreError.code),
  };
  if (res.headersSent) {
    res.end();
    return;
  }
  writeJson(res, status, body);
}

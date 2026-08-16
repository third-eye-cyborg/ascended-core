/**
 * In-memory stores and local adapter wiring for the reference server.
 *
 * Everything here is synthetic and process-local: no real vendors, no
 * persistence, no secrets. The stores compose the workspace's in-memory
 * adapters so the server can demonstrate the full domain surface offline.
 */

import { createId, type EntityId } from "@third-eye-cyborg/ascended-core";
import type {
  Community,
  CommunityEvent,
  IdentityProfile,
  Membership,
  Post,
  Reaction,
  Rsvp,
} from "@third-eye-cyborg/ascended-contracts";
import { InMemoryEventBus } from "@third-eye-cyborg/ascended-events";
import { InMemoryRepository } from "@third-eye-cyborg/ascended-persistence";
import {
  InMemoryAuthProvider,
  type AuthProvider,
} from "@third-eye-cyborg/ascended-providers";
import {
  InMemoryInAppInbox,
  InMemoryPreferences,
  NotificationService,
  RecordingEmailSender,
  RecordingPushSender,
} from "@third-eye-cyborg/ascended-notifications";
import {
  InMemoryLogger,
  InMemoryMetrics,
  type Logger,
  type MetricsPort,
} from "@third-eye-cyborg/ascended-observability";

/** All repositories and adapters the request handlers operate against. */
export interface Platform {
  readonly bus: InMemoryEventBus;
  readonly auth: AuthProvider;
  readonly profiles: InMemoryRepository<IdentityProfile>;
  readonly posts: InMemoryRepository<Post>;
  readonly reactions: InMemoryRepository<Reaction>;
  readonly communities: InMemoryRepository<Community>;
  readonly memberships: InMemoryRepository<Membership>;
  readonly events: InMemoryRepository<CommunityEvent>;
  readonly rsvps: InMemoryRepository<Rsvp>;
  readonly notifications: NotificationService;
  readonly inbox: InMemoryInAppInbox;
  readonly email: RecordingEmailSender;
  readonly push: RecordingPushSender;
  readonly metrics: MetricsPort;
  readonly logger: Logger;
  /**
   * Demo auth: bearer tokens shaped `test-<accountId>` resolve to that account
   * so examples never need a real identity provider. Returns the account id or
   * `null` when the token is not recognised.
   */
  resolveToken(token: string): EntityId | null;
}

/** Prefix marking a synthetic demo bearer token. */
const DEMO_TOKEN_PREFIX = "test-";

/** Build a fresh {@link Platform} with empty in-memory state. */
export function createPlatform(): Platform {
  const bus = new InMemoryEventBus();
  const inbox = new InMemoryInAppInbox();
  const email = new RecordingEmailSender();
  const push = new RecordingPushSender();
  const notifications = new NotificationService(bus, new InMemoryPreferences(), {
    inApp: inbox,
    email,
    push,
  });

  return {
    bus,
    auth: new InMemoryAuthProvider(),
    profiles: new InMemoryRepository<IdentityProfile>(),
    posts: new InMemoryRepository<Post>(),
    reactions: new InMemoryRepository<Reaction>(),
    communities: new InMemoryRepository<Community>(),
    memberships: new InMemoryRepository<Membership>(),
    events: new InMemoryRepository<CommunityEvent>(),
    rsvps: new InMemoryRepository<Rsvp>(),
    notifications,
    inbox,
    email,
    push,
    metrics: new InMemoryMetrics(),
    logger: new InMemoryLogger(),
    resolveToken(token: string): EntityId | null {
      if (!token.startsWith(DEMO_TOKEN_PREFIX)) return null;
      const accountId = token.slice(DEMO_TOKEN_PREFIX.length);
      return accountId.length > 0 ? (accountId as EntityId) : null;
    },
  };
}

/** Helper used by demo flows to mint a synthetic bearer token for an account. */
export function demoTokenFor(accountId: EntityId): string {
  return `${DEMO_TOKEN_PREFIX}${accountId}`;
}

/** Create a synthetic account id for use in demos and tests. */
export function newAccountId(): EntityId {
  return createId("acct");
}

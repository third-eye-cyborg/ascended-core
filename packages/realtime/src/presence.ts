/**
 * Presence contracts. Presence is ephemeral status that may expire after a
 * time-to-live so that stale entries do not linger when clients disconnect
 * without a clean leave.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@third-eye-cyborg/ascended-core";

/** Coarse presence status. Product-specific states go in {@link Metadata}. */
export enum PresenceStatus {
  ONLINE = "online",
  AWAY = "away",
  OFFLINE = "offline",
}

/** A recorded presence entry. */
export interface PresenceEntry {
  /** Account this entry describes. */
  accountId: EntityId;
  /** Current status. */
  status: PresenceStatus;
  /** When the entry was last updated. */
  updatedAt: IsoTimestamp;
  /** Absolute expiry instant, when a TTL was supplied. */
  expiresAt?: IsoTimestamp;
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/** Monotonic-enough clock abstraction for deterministic tests. */
export interface Clock {
  /** Current wall-clock time. */
  now(): Date;
}

/**
 * Port for tracking ephemeral account presence with optional TTL expiry.
 */
export interface PresenceTracker {
  /**
   * Record presence for an account. When `ttlSeconds` is provided the entry
   * expires and becomes eligible for {@link PresenceTracker.sweepExpired}.
   */
  setPresence(
    accountId: EntityId,
    status: PresenceStatus,
    ttlSeconds?: number,
    metadata?: Metadata,
  ): Promise<PresenceEntry>;
  /** Fetch a live (non-expired) presence entry, or `undefined`. */
  getPresence(accountId: EntityId): Promise<PresenceEntry | undefined>;
  /**
   * Remove all expired entries relative to the injected clock.
   * @returns the accounts whose entries were swept.
   */
  sweepExpired(): Promise<EntityId[]>;
}

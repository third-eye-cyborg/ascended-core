/**
 * In-memory {@link PresenceTracker} with an injectable {@link Clock} so that
 * TTL expiry is deterministic in tests.
 */

import { createId, nowIso, toIsoTimestamp } from "@third-eye-cyborg/core";
import type { EntityId, Metadata } from "@third-eye-cyborg/core";
import type { EventBus } from "../events";
import type { Clock, PresenceEntry, PresenceTracker } from "../presence";
import { PresenceStatus } from "../presence";

/** System clock backed by {@link Date}. */
export const systemClock: Clock = { now: () => new Date() };

/** In-memory presence tracker with TTL sweeping. */
export class LocalPresenceTracker implements PresenceTracker {
  private readonly entries = new Map<EntityId, PresenceEntry>();

  constructor(
    private readonly bus: EventBus,
    private readonly clock: Clock = systemClock,
  ) {}

  async setPresence(
    accountId: EntityId,
    status: PresenceStatus,
    ttlSeconds?: number,
    metadata?: Metadata,
  ): Promise<PresenceEntry> {
    const now = this.clock.now();
    const entry: PresenceEntry = {
      accountId,
      status,
      updatedAt: toIsoTimestamp(now),
      ...(ttlSeconds !== undefined
        ? { expiresAt: toIsoTimestamp(new Date(now.getTime() + ttlSeconds * 1000)) }
        : {}),
      ...(metadata ? { metadata } : {}),
    };
    this.entries.set(accountId, entry);
    await this.emit("realtime.presence_updated", { accountId, status });
    return entry;
  }

  async getPresence(accountId: EntityId): Promise<PresenceEntry | undefined> {
    const entry = this.entries.get(accountId);
    if (!entry) return undefined;
    if (this.isExpired(entry)) return undefined;
    return entry;
  }

  async sweepExpired(): Promise<EntityId[]> {
    const swept: EntityId[] = [];
    for (const [accountId, entry] of this.entries) {
      if (this.isExpired(entry)) {
        this.entries.delete(accountId);
        swept.push(accountId);
      }
    }
    if (swept.length > 0) {
      await this.emit("realtime.presence_expired", { accountIds: swept });
    }
    return swept;
  }

  private isExpired(entry: PresenceEntry): boolean {
    if (!entry.expiresAt) return false;
    return new Date(entry.expiresAt).getTime() <= this.clock.now().getTime();
  }

  private async emit(type: string, payload: Record<string, unknown>): Promise<void> {
    await this.bus.publish({ id: createId("evt"), type, occurredAt: nowIso(), payload });
  }
}

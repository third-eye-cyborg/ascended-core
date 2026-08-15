/**
 * Notification preference contracts. Preferences gate which channels and
 * templates a recipient will receive.
 */

import type { EntityId } from "@ascended/core";
import { NotificationChannel } from "./types";

/** A recipient's notification preferences. */
export interface NotificationPreferences {
  /** Per-channel enablement. Missing channels default to allowed. */
  channels: Record<NotificationChannel, boolean>;
  /** Template keys that should never be delivered on any channel. */
  mutedTemplates: string[];
}

/** Port for reading and writing recipient preferences. */
export interface NotificationPreferencesPort {
  /** Fetch preferences for an account (allow-all default when unset). */
  getPreferences(accountId: EntityId): Promise<NotificationPreferences>;
  /** Persist preferences for an account. */
  setPreferences(accountId: EntityId, preferences: NotificationPreferences): Promise<void>;
}

/** Build an allow-all default preferences object. */
export function allowAllPreferences(): NotificationPreferences {
  return {
    channels: {
      [NotificationChannel.IN_APP]: true,
      [NotificationChannel.EMAIL]: true,
      [NotificationChannel.PUSH]: true,
    },
    mutedTemplates: [],
  };
}

/** In-memory preferences store defaulting every account to allow-all. */
export class InMemoryPreferences implements NotificationPreferencesPort {
  private readonly store = new Map<EntityId, NotificationPreferences>();

  async getPreferences(accountId: EntityId): Promise<NotificationPreferences> {
    return this.store.get(accountId) ?? allowAllPreferences();
  }

  async setPreferences(
    accountId: EntityId,
    preferences: NotificationPreferences,
  ): Promise<void> {
    this.store.set(accountId, preferences);
  }
}

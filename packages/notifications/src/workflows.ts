/**
 * Reminder scheduling contracts. This models the *bookkeeping* of scheduled
 * reminders only — there is no cron engine and no vendor push integration.
 */

import { createId, toIsoTimestamp } from "@ascended/core";
import type { EntityId, IsoTimestamp } from "@ascended/core";
import type { NotificationRequest } from "./types";

/** A scheduled reminder that will fire at or after `fireAt`. */
export interface ScheduledReminder {
  /** Opaque reminder id, e.g. `rem_…`. */
  id: EntityId;
  /** When the reminder becomes due. */
  fireAt: IsoTimestamp;
  /** The notification to dispatch when due. */
  request: NotificationRequest;
}

/** Clock abstraction for deterministic reminder-queue tests. */
export interface Clock {
  /** Current wall-clock time. */
  now(): Date;
}

/** Port for scheduling and cancelling reminders. */
export interface ReminderSchedulerPort {
  /** Schedule a reminder to fire at `fireAt`, returning it. */
  scheduleReminder(fireAt: IsoTimestamp, request: NotificationRequest): Promise<ScheduledReminder>;
  /** Cancel a previously scheduled reminder. No-op if unknown. */
  cancelReminder(reminderId: EntityId): Promise<void>;
}

/** System clock backed by {@link Date}. */
export const systemClock: Clock = { now: () => new Date() };

/**
 * In-memory reminder queue. `due()` returns reminders that are due relative to
 * the injected clock, ordered by ascending `fireAt`.
 */
export class InMemoryReminderQueue implements ReminderSchedulerPort {
  private readonly reminders = new Map<EntityId, ScheduledReminder>();

  constructor(private readonly clock: Clock = systemClock) {}

  async scheduleReminder(
    fireAt: IsoTimestamp,
    request: NotificationRequest,
  ): Promise<ScheduledReminder> {
    const reminder: ScheduledReminder = { id: createId("rem"), fireAt, request };
    this.reminders.set(reminder.id, reminder);
    return reminder;
  }

  async cancelReminder(reminderId: EntityId): Promise<void> {
    this.reminders.delete(reminderId);
  }

  /** Return due reminders in ascending fire-time order, without removing them. */
  due(): ScheduledReminder[] {
    const now = this.clock.now().getTime();
    return [...this.reminders.values()]
      .filter((r) => new Date(r.fireAt).getTime() <= now)
      .sort((a, b) => new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime());
  }

  /** Pop due reminders (ascending order), removing them from the queue. */
  drainDue(): ScheduledReminder[] {
    const due = this.due();
    for (const reminder of due) this.reminders.delete(reminder.id);
    return due;
  }

  /** Convenience: normalize a {@link Date} to the queue's timestamp type. */
  static at(date: Date): IsoTimestamp {
    return toIsoTimestamp(date);
  }
}

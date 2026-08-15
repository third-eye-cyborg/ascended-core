import { describe, it, expect } from "vitest";
import { createId, toIsoTimestamp } from "@ascended/core";
import { InMemoryReminderQueue } from "../src/workflows";
import type { NotificationRequest } from "../src/types";
import { FakeClock } from "./support";

function request(): NotificationRequest {
  return { recipientAccountId: createId("acct"), template: "reminder", data: {} };
}

describe("InMemoryReminderQueue", () => {
  it("returns due reminders ordered by ascending fireAt", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const queue = new InMemoryReminderQueue(clock);

    const later = await queue.scheduleReminder(
      toIsoTimestamp(new Date("2026-01-01T00:00:20.000Z")),
      request(),
    );
    const sooner = await queue.scheduleReminder(
      toIsoTimestamp(new Date("2026-01-01T00:00:10.000Z")),
      request(),
    );

    expect(queue.due()).toHaveLength(0);

    clock.set(new Date("2026-01-01T00:00:25.000Z"));
    const due = queue.due();
    expect(due.map((r) => r.id)).toEqual([sooner.id, later.id]);
  });

  it("cancel removes a reminder before it fires", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const queue = new InMemoryReminderQueue(clock);
    const reminder = await queue.scheduleReminder(
      toIsoTimestamp(new Date("2026-01-01T00:00:05.000Z")),
      request(),
    );
    await queue.cancelReminder(reminder.id);
    clock.set(new Date("2026-01-01T00:01:00.000Z"));
    expect(queue.due()).toHaveLength(0);
  });

  it("drainDue removes and returns due reminders", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const queue = new InMemoryReminderQueue(clock);
    await queue.scheduleReminder(toIsoTimestamp(new Date("2025-12-31T23:59:00.000Z")), request());
    const drained = queue.drainDue();
    expect(drained).toHaveLength(1);
    expect(queue.due()).toHaveLength(0);
  });
});

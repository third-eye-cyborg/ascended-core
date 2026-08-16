import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/ascended-core";
import { LocalPresenceTracker } from "../src/local/presence";
import { PresenceStatus } from "../src/presence";
import { FakeClock, RecordingEventBus } from "./support";

describe("LocalPresenceTracker", () => {
  it("expires presence after its TTL", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const tracker = new LocalPresenceTracker(new RecordingEventBus(), clock);
    const account = createId("acct");

    await tracker.setPresence(account, PresenceStatus.ONLINE, 30);
    expect(await tracker.getPresence(account)).toBeDefined();

    clock.advance(31_000);
    expect(await tracker.getPresence(account)).toBeUndefined();

    const swept = await tracker.sweepExpired();
    expect(swept).toContain(account);
  });

  it("keeps presence without a TTL", async () => {
    const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    const tracker = new LocalPresenceTracker(new RecordingEventBus(), clock);
    const account = createId("acct");
    await tracker.setPresence(account, PresenceStatus.AWAY);
    clock.advance(10_000_000);
    expect(await tracker.getPresence(account)).toBeDefined();
    expect(await tracker.sweepExpired()).toHaveLength(0);
  });
});

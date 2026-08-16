import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/ascended-core";
import { LocalCallSessions } from "../src/local/calls";
import { CallSessionState } from "../src/calls";
import { RecordingEventBus } from "./support";

describe("LocalCallSessions", () => {
  it("transitions created -> active -> ended", async () => {
    const calls = new LocalCallSessions(new RecordingEventBus());
    const session = await calls.createSession();
    expect(session.state).toBe(CallSessionState.CREATED);

    const account = createId("acct");
    const active = await calls.addParticipant(session.id, account, { audioEnabled: true });
    expect(active.state).toBe(CallSessionState.ACTIVE);
    expect(active.participants[0]?.media.audioEnabled).toBe(true);

    const muted = await calls.updateMediaState(session.id, account, { audioEnabled: false });
    expect(muted.participants[0]?.media.audioEnabled).toBe(false);

    const removed = await calls.removeParticipant(session.id, account);
    expect(removed.participants).toHaveLength(0);

    const ended = await calls.endSession(session.id);
    expect(ended.state).toBe(CallSessionState.ENDED);
    expect(ended.endedAt).toBeDefined();
  });

  it("rejects adding a participant to an ended session", async () => {
    const calls = new LocalCallSessions(new RecordingEventBus());
    const session = await calls.createSession();
    await calls.endSession(session.id);
    await expect(calls.addParticipant(session.id, createId("acct"))).rejects.toThrow();
  });
});

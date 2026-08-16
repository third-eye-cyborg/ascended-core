import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/ascended-core";
import { LocalRoomManager } from "../src/local/rooms";
import { RoomState } from "../src/rooms";
import { RecordingEventBus } from "./support";

describe("LocalRoomManager", () => {
  it("emits realtime.room_joined on join and removes on leave", async () => {
    const bus = new RecordingEventBus();
    const rooms = new LocalRoomManager(bus);
    const room = await rooms.createRoom();
    const account = createId("acct");

    await rooms.joinRoom(room.id, account);
    expect(bus.types()).toContain("realtime.room_joined");
    expect(await rooms.listParticipants(room.id)).toHaveLength(1);

    await rooms.leaveRoom(room.id, account);
    expect(bus.types()).toContain("realtime.room_left");
    expect(await rooms.listParticipants(room.id)).toHaveLength(0);
  });

  it("is idempotent for repeat joins", async () => {
    const rooms = new LocalRoomManager(new RecordingEventBus());
    const room = await rooms.createRoom();
    const account = createId("acct");
    await rooms.joinRoom(room.id, account);
    await rooms.joinRoom(room.id, account);
    expect(await rooms.listParticipants(room.id)).toHaveLength(1);
  });

  it("rejects joining a closed room", async () => {
    const rooms = new LocalRoomManager(new RecordingEventBus());
    const room = await rooms.createRoom();
    const closed = await rooms.closeRoom(room.id);
    expect(closed.state).toBe(RoomState.CLOSED);
    await expect(rooms.joinRoom(room.id, createId("acct"))).rejects.toThrow();
  });
});

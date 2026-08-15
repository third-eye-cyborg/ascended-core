/**
 * In-memory {@link RoomManager}. Emits `realtime.room_joined` / room lifecycle
 * events through an injected {@link EventBus}.
 */

import { CoreError, ErrorCode, createId, nowIso } from "@ascended/core";
import type { EntityId, Metadata } from "@ascended/core";
import type { EventBus } from "../events";
import type {
  CreateRoomOptions,
  Room,
  RoomManager,
  RoomParticipant,
} from "../rooms";
import { RoomState } from "../rooms";

interface RoomRecord {
  room: Room;
  participants: Map<EntityId, RoomParticipant>;
}

/** In-memory room manager suitable for local development and tests. */
export class LocalRoomManager implements RoomManager {
  private readonly rooms = new Map<EntityId, RoomRecord>();

  constructor(private readonly bus: EventBus) {}

  async createRoom(options?: CreateRoomOptions): Promise<Room> {
    const id = options?.id ?? createId("room");
    if (this.rooms.has(id)) {
      throw new CoreError({ code: ErrorCode.CONFLICT, message: `Room ${id} already exists.` });
    }
    const room: Room = {
      id,
      state: RoomState.OPEN,
      createdAt: nowIso(),
      ...(options?.metadata ? { metadata: options.metadata } : {}),
    };
    this.rooms.set(id, { room, participants: new Map() });
    await this.emit("realtime.room_created", { roomId: id });
    return room;
  }

  async joinRoom(
    roomId: EntityId,
    accountId: EntityId,
    metadata?: Metadata,
  ): Promise<RoomParticipant> {
    const record = this.require(roomId);
    if (record.room.state === RoomState.CLOSED) {
      throw new CoreError({ code: ErrorCode.CONFLICT, message: `Room ${roomId} is closed.` });
    }
    const existing = record.participants.get(accountId);
    if (existing) return existing;
    const participant: RoomParticipant = {
      accountId,
      joinedAt: nowIso(),
      ...(metadata ? { metadata } : {}),
    };
    record.participants.set(accountId, participant);
    await this.emit("realtime.room_joined", { roomId, accountId });
    return participant;
  }

  async leaveRoom(roomId: EntityId, accountId: EntityId): Promise<void> {
    const record = this.require(roomId);
    if (record.participants.delete(accountId)) {
      await this.emit("realtime.room_left", { roomId, accountId });
    }
  }

  async closeRoom(roomId: EntityId): Promise<Room> {
    const record = this.require(roomId);
    record.room = { ...record.room, state: RoomState.CLOSED };
    await this.emit("realtime.room_closed", { roomId });
    return record.room;
  }

  async getRoom(roomId: EntityId): Promise<Room | undefined> {
    return this.rooms.get(roomId)?.room;
  }

  async listParticipants(roomId: EntityId): Promise<RoomParticipant[]> {
    return [...this.require(roomId).participants.values()];
  }

  private require(roomId: EntityId): RoomRecord {
    const record = this.rooms.get(roomId);
    if (!record) {
      throw new CoreError({ code: ErrorCode.NOT_FOUND, message: `Room ${roomId} not found.` });
    }
    return record;
  }

  private async emit(type: string, payload: Record<string, unknown>): Promise<void> {
    await this.bus.publish({ id: createId("evt"), type, occurredAt: nowIso(), payload });
  }
}

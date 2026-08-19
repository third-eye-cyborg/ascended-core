/**
 * Room lifecycle contracts. A room is a durable membership boundary that
 * participants can join and leave; higher layers (pub/sub, calls) reference
 * rooms by id.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@third-eye-cyborg/core";

/** Lifecycle state of a room. */
export enum RoomState {
  OPEN = "open",
  CLOSED = "closed",
}

/** A participant inside a room. */
export interface RoomParticipant {
  /** Account that is present in the room. */
  accountId: EntityId;
  /** When the participant joined. */
  joinedAt: IsoTimestamp;
  /** Optional per-participant extension metadata. */
  metadata?: Metadata;
}

/** A room and its current membership. */
export interface Room {
  /** Opaque room id, e.g. `room_…`. */
  id: EntityId;
  /** Current lifecycle state. */
  state: RoomState;
  /** When the room was created. */
  createdAt: IsoTimestamp;
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/** Options accepted when creating a room. */
export interface CreateRoomOptions {
  /** Optional caller-supplied id; generated when omitted. */
  id?: EntityId;
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/**
 * Port for room lifecycle and membership management. Implementations are
 * expected to be idempotent for repeated joins/leaves of the same account.
 */
export interface RoomManager {
  /** Create a new open room. */
  createRoom(options?: CreateRoomOptions): Promise<Room>;
  /** Add an account to a room, returning the resulting participant. */
  joinRoom(roomId: EntityId, accountId: EntityId, metadata?: Metadata): Promise<RoomParticipant>;
  /** Remove an account from a room. No-op if not present. */
  leaveRoom(roomId: EntityId, accountId: EntityId): Promise<void>;
  /** Close a room, transitioning it to {@link RoomState.CLOSED}. */
  closeRoom(roomId: EntityId): Promise<Room>;
  /** Fetch a room by id, or `undefined` when unknown. */
  getRoom(roomId: EntityId): Promise<Room | undefined>;
  /** List current participants of a room. */
  listParticipants(roomId: EntityId): Promise<RoomParticipant[]>;
}

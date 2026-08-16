/**
 * Realtime bounded context: room descriptors, participants, and call sessions.
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@third-eye-cyborg/ascended-core";
import { hasTimestamps, isEnumMember, isRecord } from "./internal/guards";

/** Describes a realtime room that participants can join. */
export interface RoomDescriptor {
  id: EntityId;
  /** Opaque room name/key used by transport adapters. */
  name: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** A participant currently associated with a room. */
export interface RoomParticipant {
  id: EntityId;
  roomId: EntityId;
  accountId: EntityId;
  joinedAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Lifecycle state of a call session. */
export enum CallSessionState {
  RINGING = "ringing",
  ACTIVE = "active",
  ENDED = "ended",
}

/** A call session anchored to a room. */
export interface CallSession {
  id: EntityId;
  roomId: EntityId;
  state: CallSessionState;
  startedAt?: IsoTimestamp;
  endedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Type guard for {@link RoomDescriptor}. */
export function isRoomDescriptor(value: unknown): value is RoomDescriptor {
  if (!isRecord(value)) return false;
  return isEntityId(value["id"]) && typeof value["name"] === "string" && hasTimestamps(value);
}

/** Type guard for {@link RoomParticipant}. */
export function isRoomParticipant(value: unknown): value is RoomParticipant {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["roomId"]) &&
    isEntityId(value["accountId"]) &&
    typeof value["joinedAt"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link CallSessionState}. */
export function isCallSessionState(value: unknown): value is CallSessionState {
  return isEnumMember(CallSessionState, value);
}

/** Type guard for {@link CallSession}. */
export function isCallSession(value: unknown): value is CallSession {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["roomId"]) &&
    isCallSessionState(value["state"]) &&
    hasTimestamps(value)
  );
}

/**
 * Identity bounded context: accounts, identity profiles, and presence.
 *
 * These are platform-neutral shapes. Product-specific vocabularies attach via
 * the `metadata` extension point rather than being hard-coded here.
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@ascended/core";
import { hasTimestamps, isEnumMember, isRecord } from "./internal/guards";

/** A registered account. Authentication details live in adapters, not here. */
export interface Account {
  id: EntityId;
  /** Synthetic handle, unique per platform (e.g. "ada-example"). */
  handle: string;
  /** Contact email used for account operations. */
  email: string;
  displayName: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Public-facing profile associated with an account. */
export interface IdentityProfile {
  id: EntityId;
  accountId: EntityId;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Coarse presence indicator for an account. */
export enum PresenceStatus {
  ONLINE = "online",
  AWAY = "away",
  BUSY = "busy",
  OFFLINE = "offline",
  INVISIBLE = "invisible",
}

/** Point-in-time presence record for an account. */
export interface PresenceRecord {
  id: EntityId;
  accountId: EntityId;
  status: PresenceStatus;
  /** When presence was last observed. */
  lastSeenAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Type guard for {@link Account}. */
export function isAccount(value: unknown): value is Account {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    typeof value["handle"] === "string" &&
    typeof value["email"] === "string" &&
    typeof value["displayName"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link IdentityProfile}. */
export function isIdentityProfile(value: unknown): value is IdentityProfile {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["accountId"]) &&
    typeof value["displayName"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link PresenceStatus}. */
export function isPresenceStatus(value: unknown): value is PresenceStatus {
  return isEnumMember(PresenceStatus, value);
}

/** Type guard for {@link PresenceRecord}. */
export function isPresenceRecord(value: unknown): value is PresenceRecord {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["accountId"]) &&
    isPresenceStatus(value["status"]) &&
    typeof value["lastSeenAt"] === "string" &&
    hasTimestamps(value)
  );
}

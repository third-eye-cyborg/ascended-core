/**
 * Community bounded context: communities, channels, memberships, roles, and
 * invites.
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@third-eye-cyborg/ascended-core";
import { hasTimestamps, isRecord } from "./internal/guards";

/** A community groups people, channels, and roles together. */
export interface Community {
  id: EntityId;
  name: string;
  ownerId: EntityId;
  description?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Channel medium within a community. */
export type ChannelKind = "text" | "voice" | "video" | "announcement";

/** A channel inside a community. */
export interface Channel {
  id: EntityId;
  communityId: EntityId;
  name: string;
  kind: ChannelKind;
  topic?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** A role that can be assigned to members within a community. */
export interface Role {
  id: EntityId;
  communityId: EntityId;
  name: string;
  /** Open list of permission keys; contracts do not enforce semantics. */
  permissions: string[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** An account's membership in a community. */
export interface Membership {
  id: EntityId;
  communityId: EntityId;
  accountId: EntityId;
  roleIds: EntityId[];
  joinedAt: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** An invitation to join a community. */
export interface Invite {
  id: EntityId;
  communityId: EntityId;
  code: string;
  createdBy: EntityId;
  expiresAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

const CHANNEL_KINDS: readonly ChannelKind[] = ["text", "voice", "video", "announcement"];

/** Type guard for {@link Community}. */
export function isCommunity(value: unknown): value is Community {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    typeof value["name"] === "string" &&
    isEntityId(value["ownerId"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Channel}. */
export function isChannel(value: unknown): value is Channel {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["communityId"]) &&
    typeof value["name"] === "string" &&
    typeof value["kind"] === "string" &&
    (CHANNEL_KINDS as string[]).includes(value["kind"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Role}. */
export function isRole(value: unknown): value is Role {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["communityId"]) &&
    typeof value["name"] === "string" &&
    Array.isArray(value["permissions"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Membership}. */
export function isMembership(value: unknown): value is Membership {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["communityId"]) &&
    isEntityId(value["accountId"]) &&
    Array.isArray(value["roleIds"]) &&
    typeof value["joinedAt"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Invite}. */
export function isInvite(value: unknown): value is Invite {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["communityId"]) &&
    typeof value["code"] === "string" &&
    isEntityId(value["createdBy"]) &&
    hasTimestamps(value)
  );
}

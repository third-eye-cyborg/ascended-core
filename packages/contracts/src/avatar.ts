/**
 * Avatar bounded context: character avatar profiles and generation jobs.
 *
 * `modelRef`/`thumbnailRef` are opaque references resolved by media adapters;
 * this contract never names a specific generation provider.
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@ascended/core";
import { hasTimestamps, isEnumMember, isRecord } from "./internal/guards";

/** A character avatar profile owned by an account. */
export interface AvatarProfile {
  id: EntityId;
  accountId: EntityId;
  displayName: string;
  /** Opaque reference to the avatar model asset. */
  modelRef?: string;
  /** Opaque reference to a thumbnail asset. */
  thumbnailRef?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Lifecycle state of an avatar generation job. */
export enum AvatarGenerationState {
  QUEUED = "queued",
  PROCESSING = "processing",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
}

/** A generation job that produces or updates an avatar asset. */
export interface AvatarGeneration {
  id: EntityId;
  avatarProfileId: EntityId;
  state: AvatarGenerationState;
  /** Opaque reference to the produced asset once succeeded. */
  resultRef?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Type guard for {@link AvatarProfile}. */
export function isAvatarProfile(value: unknown): value is AvatarProfile {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["accountId"]) &&
    typeof value["displayName"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link AvatarGenerationState}. */
export function isAvatarGenerationState(value: unknown): value is AvatarGenerationState {
  return isEnumMember(AvatarGenerationState, value);
}

/** Type guard for {@link AvatarGeneration}. */
export function isAvatarGeneration(value: unknown): value is AvatarGeneration {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["avatarProfileId"]) &&
    isAvatarGenerationState(value["state"]) &&
    hasTimestamps(value)
  );
}

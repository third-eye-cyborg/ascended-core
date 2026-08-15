/**
 * Content bounded context: posts, comments, reactions, bookmarks, media
 * attachments, and a moderation-surface interface shape (no rules).
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@ascended/core";
import { hasTimestamps, isEnumMember, isRecord } from "./internal/guards";

/** Who can see a piece of content. */
export enum ContentVisibility {
  PUBLIC = "public",
  UNLISTED = "unlisted",
  FOLLOWERS = "followers",
  PRIVATE = "private",
}

/** Media type for an attachment. */
export type MediaKind = "image" | "video" | "audio" | "document";

/** A media file attached to content. */
export interface MediaAttachment {
  id: EntityId;
  kind: MediaKind;
  url: string;
  mimeType: string;
  sizeBytes: number;
  /** Accessibility description. */
  altText?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** A top-level authored post. */
export interface Post {
  id: EntityId;
  authorId: EntityId;
  body: string;
  visibility: ContentVisibility;
  attachments?: MediaAttachment[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** A comment on a post (or reply to another comment via `parentId`). */
export interface Comment {
  id: EntityId;
  postId: EntityId;
  authorId: EntityId;
  parentId?: EntityId;
  body: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/**
 * A reaction to content. `kind` is an open string so products may define their
 * own reaction vocabularies without changing this contract.
 */
export interface Reaction {
  id: EntityId;
  targetId: EntityId;
  accountId: EntityId;
  kind: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** A saved bookmark pointing at a content item. */
export interface Bookmark {
  id: EntityId;
  accountId: EntityId;
  targetId: EntityId;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

/** Moderation lifecycle state for a moderation surface. */
export enum ModerationState {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  ESCALATED = "escalated",
}

/**
 * Interface shape describing a moderation surface for a content item.
 * Contracts carry state only; moderation rules and internals live elsewhere.
 */
export interface ModerationSurface {
  id: EntityId;
  contentId: EntityId;
  contentType: string;
  state: ModerationState;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata?: Metadata;
}

const MEDIA_KINDS: readonly MediaKind[] = ["image", "video", "audio", "document"];

/** Type guard for {@link ContentVisibility}. */
export function isContentVisibility(value: unknown): value is ContentVisibility {
  return isEnumMember(ContentVisibility, value);
}

/** Type guard for {@link MediaAttachment}. */
export function isMediaAttachment(value: unknown): value is MediaAttachment {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    typeof value["kind"] === "string" &&
    (MEDIA_KINDS as string[]).includes(value["kind"]) &&
    typeof value["url"] === "string" &&
    typeof value["mimeType"] === "string" &&
    typeof value["sizeBytes"] === "number" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Post}. */
export function isPost(value: unknown): value is Post {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["authorId"]) &&
    typeof value["body"] === "string" &&
    isContentVisibility(value["visibility"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Comment}. */
export function isComment(value: unknown): value is Comment {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["postId"]) &&
    isEntityId(value["authorId"]) &&
    typeof value["body"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Reaction}. */
export function isReaction(value: unknown): value is Reaction {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["targetId"]) &&
    isEntityId(value["accountId"]) &&
    typeof value["kind"] === "string" &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link Bookmark}. */
export function isBookmark(value: unknown): value is Bookmark {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["accountId"]) &&
    isEntityId(value["targetId"]) &&
    hasTimestamps(value)
  );
}

/** Type guard for {@link ModerationState}. */
export function isModerationState(value: unknown): value is ModerationState {
  return isEnumMember(ModerationState, value);
}

/** Type guard for {@link ModerationSurface}. */
export function isModerationSurface(value: unknown): value is ModerationSurface {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["contentId"]) &&
    typeof value["contentType"] === "string" &&
    isModerationState(value["state"]) &&
    hasTimestamps(value)
  );
}

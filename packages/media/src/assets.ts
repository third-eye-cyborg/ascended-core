/**
 * Media asset contracts. Assets are storage-backed binary objects with a
 * lifecycle state; no CDN URLs, multipart parsing, or vendor storage APIs are
 * described here.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@ascended/core";

/** Broad category of a media asset. */
export enum MediaKind {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
}

/** Lifecycle state of a media asset. */
export enum MediaAssetState {
  PENDING = "pending",
  READY = "ready",
  FAILED = "failed",
  DELETED = "deleted",
}

/** A storage-backed media asset. */
export interface MediaAsset {
  /** Opaque asset id, e.g. `asset_…`. */
  id: EntityId;
  /** Account that owns the asset. */
  ownerId: EntityId;
  /** Broad category. */
  kind: MediaKind;
  /** MIME content type, e.g. `image/png`. */
  contentType: string;
  /** Size of the stored object in bytes. */
  sizeBytes: number;
  /** Opaque storage key used by the backing store. */
  storageKey: string;
  /** Public URL, when the asset has one. */
  publicUrl?: string;
  /** Current lifecycle state. */
  state: MediaAssetState;
  /** Accessibility alt text, when provided. */
  altText?: string;
  /** When the asset record was created. */
  createdAt: IsoTimestamp;
  /** Optional extension metadata. */
  metadata?: Metadata;
}

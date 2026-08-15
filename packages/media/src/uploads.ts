/**
 * Upload-session contracts. Sessions negotiate how a client should transfer
 * bytes; this package models the *bookkeeping* only — no multipart parsing.
 */

import type { EntityId, IsoTimestamp } from "@ascended/core";

/** How a client is expected to transfer bytes. */
export type UploadMethod = "direct" | "proxy";

/** Constraints echoed back to a client for a negotiated upload. */
export interface UploadConstraints {
  /** Maximum accepted size in bytes for this session. */
  maxSizeBytes: number;
  /** Content types accepted for this session. */
  allowedContentTypes: string[];
}

/** A negotiated upload session. */
export interface UploadSession {
  /** Opaque upload id, e.g. `upload_…`. */
  uploadId: EntityId;
  /** Negotiated transfer method. */
  method: UploadMethod;
  /** When the session expires and can no longer be completed. */
  expiresAt: IsoTimestamp;
  /** Constraints the client must honor. */
  constraints: UploadConstraints;
}

/** Parameters used to begin an upload. */
export interface BeginUploadInput {
  /** Account that will own the resulting asset. */
  ownerId: EntityId;
  /** Original filename supplied by the client. */
  filename: string;
  /** Declared MIME content type. */
  contentType: string;
  /** Declared size in bytes. */
  sizeBytes: number;
}

/** Policy that bounds a single upload session. */
export interface UploadPolicy {
  /** Maximum accepted size, in bytes. */
  maxSizeBytes: number;
  /** Content types the policy permits. */
  allowedContentTypes: string[];
}

/**
 * Port for negotiating and finalizing upload sessions.
 */
export interface UploadSessionPort {
  /** Begin an upload session after validating it against the active policy. */
  beginUpload(input: BeginUploadInput): Promise<UploadSession>;
  /** Complete an upload, transitioning the asset to `ready`. */
  completeUpload(uploadId: EntityId): Promise<void>;
  /** Abort an in-flight upload, discarding any partial state. */
  abortUpload(uploadId: EntityId): Promise<void>;
}

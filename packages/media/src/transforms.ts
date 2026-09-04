/**
 * Media transform contracts. A transform request describes a desired
 * derivative (resize/format/quality); execution is delegated to adapters.
 */

import type { EntityId, IsoTimestamp } from "@third-eye-cyborg/core";

/** Lifecycle state of a transform job. */
export enum TransformJobState {
  QUEUED = "queued",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

/** Desired output characteristics for a transform. */
export interface TransformSpec {
  /** Target width in pixels. */
  width?: number;
  /** Target height in pixels. */
  height?: number;
  /** Target output format, e.g. `webp`. Generic, not vendor-specific. */
  format?: string;
  /** Target quality from 1–100, when the format supports it. */
  quality?: number;
}

/** A requested transform of a source asset. */
export interface TransformJob {
  /** Opaque job id, e.g. `xform_…`. */
  id: EntityId;
  /** Source asset the transform derives from. */
  assetId: EntityId;
  /** Requested output spec. */
  spec: TransformSpec;
  /** Current job state. */
  state: TransformJobState;
  /** When the job was created. */
  createdAt: IsoTimestamp;
  /** Asset id of the produced derivative, when completed. */
  outputAssetId?: EntityId;
  /** Failure reason when the job failed. */
  failureReason?: string;
}

/** Port for requesting media transforms. */
export interface TransformPort {
  /** Request a transform of `assetId` per `spec`, returning the job. */
  requestTransform(assetId: EntityId, spec: TransformSpec): Promise<TransformJob>;
}

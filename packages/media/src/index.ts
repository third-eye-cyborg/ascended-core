/**
 * `@third-eye-cyborg/ascended-media` — upload sessions, asset lifecycle, and transform request
 * contracts with a local in-memory adapter.
 */

export type { DomainEvent, EventBus } from "./events";

export type { MediaAsset } from "./assets";
export { MediaAssetState, MediaKind } from "./assets";

export type {
  BeginUploadInput,
  UploadConstraints,
  UploadMethod,
  UploadPolicy,
  UploadSession,
  UploadSessionPort,
} from "./uploads";

export type { TransformJob, TransformPort, TransformSpec } from "./transforms";
export { TransformJobState } from "./transforms";

export type { ObjectStoragePort } from "./local";
export { InMemoryObjectStorage, LocalMediaService, NoopTransformPort } from "./local";

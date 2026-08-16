/**
 * Local in-memory media service and a no-op transform port.
 *
 * The service defines its own minimal object-storage interface so it takes no
 * dependency on any vendor SDK. Assets and upload sessions live in memory and
 * emit `media.asset_uploaded` through an injected {@link EventBus}.
 */

import { CoreError, ErrorCode, createId, nowIso, toIsoTimestamp } from "@third-eye-cyborg/ascended-core";
import type { EntityId } from "@third-eye-cyborg/ascended-core";
import type { EventBus } from "./events";
import { MediaAssetState, MediaKind } from "./assets";
import type { MediaAsset } from "./assets";
import type {
  BeginUploadInput,
  UploadPolicy,
  UploadSession,
  UploadSessionPort,
} from "./uploads";
import { TransformJobState } from "./transforms";
import type { TransformJob, TransformPort, TransformSpec } from "./transforms";

/**
 * Minimal object-storage port. Adapters map this onto real object stores; the
 * local implementation keeps bytes-free records only (no actual blobs).
 */
export interface ObjectStoragePort {
  /** Reserve/record a storage key for an object. */
  put(key: string, contentType: string, sizeBytes: number): Promise<void>;
  /** Return a URL for an object, or `undefined` when none is available. */
  getUrl(key: string): Promise<string | undefined>;
  /** Delete an object by key. No-op when absent. */
  delete(key: string): Promise<void>;
}

/** In-memory {@link ObjectStoragePort} that tracks keys without storing bytes. */
export class InMemoryObjectStorage implements ObjectStoragePort {
  private readonly keys = new Set<string>();

  async put(key: string): Promise<void> {
    this.keys.add(key);
  }

  async getUrl(key: string): Promise<string | undefined> {
    return this.keys.has(key) ? `memory://${key}` : undefined;
  }

  async delete(key: string): Promise<void> {
    this.keys.delete(key);
  }
}

interface UploadRecord {
  session: UploadSession;
  asset: MediaAsset;
}

/** Default TTL applied to negotiated upload sessions, in seconds. */
const DEFAULT_UPLOAD_TTL_SECONDS = 900;

function inferKind(contentType: string): MediaKind {
  if (contentType.startsWith("image/")) return MediaKind.IMAGE;
  if (contentType.startsWith("video/")) return MediaKind.VIDEO;
  if (contentType.startsWith("audio/")) return MediaKind.AUDIO;
  return MediaKind.DOCUMENT;
}

/**
 * In-memory media service implementing the upload session port plus asset
 * lifecycle helpers. Emits `media.asset_uploaded` when an upload completes.
 */
export class LocalMediaService implements UploadSessionPort {
  private readonly uploads = new Map<EntityId, UploadRecord>();
  private readonly assets = new Map<EntityId, MediaAsset>();

  constructor(
    private readonly bus: EventBus,
    private readonly policy: UploadPolicy,
    private readonly storage: ObjectStoragePort = new InMemoryObjectStorage(),
    private readonly ttlSeconds: number = DEFAULT_UPLOAD_TTL_SECONDS,
  ) {}

  async beginUpload(input: BeginUploadInput): Promise<UploadSession> {
    if (input.sizeBytes <= 0) {
      throw new CoreError({
        code: ErrorCode.VALIDATION,
        message: "sizeBytes must be a positive integer.",
        context: { sizeBytes: input.sizeBytes },
      });
    }
    if (input.sizeBytes > this.policy.maxSizeBytes) {
      throw new CoreError({
        code: ErrorCode.VALIDATION,
        message: `Upload exceeds max size of ${this.policy.maxSizeBytes} bytes.`,
        context: { sizeBytes: input.sizeBytes, maxSizeBytes: this.policy.maxSizeBytes },
      });
    }
    if (!this.policy.allowedContentTypes.includes(input.contentType)) {
      throw new CoreError({
        code: ErrorCode.VALIDATION,
        message: `Content type ${input.contentType} is not allowed.`,
        context: { contentType: input.contentType },
      });
    }

    const uploadId = createId("upload");
    const storageKey = `${input.ownerId}/${uploadId}`;
    await this.storage.put(storageKey, input.contentType, input.sizeBytes);

    const now = new Date();
    const session: UploadSession = {
      uploadId,
      method: "direct",
      expiresAt: toIsoTimestamp(new Date(now.getTime() + this.ttlSeconds * 1000)),
      constraints: {
        maxSizeBytes: this.policy.maxSizeBytes,
        allowedContentTypes: [...this.policy.allowedContentTypes],
      },
    };

    const asset: MediaAsset = {
      id: createId("asset"),
      ownerId: input.ownerId,
      kind: inferKind(input.contentType),
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      storageKey,
      state: MediaAssetState.PENDING,
      createdAt: toIsoTimestamp(now),
    };

    this.uploads.set(uploadId, { session, asset });
    this.assets.set(asset.id, asset);
    return session;
  }

  async completeUpload(uploadId: EntityId): Promise<void> {
    const record = this.requireUpload(uploadId);
    const publicUrl = await this.storage.getUrl(record.asset.storageKey);
    const ready: MediaAsset = {
      ...record.asset,
      state: MediaAssetState.READY,
      ...(publicUrl ? { publicUrl } : {}),
    };
    this.assets.set(ready.id, ready);
    this.uploads.delete(uploadId);
    await this.bus.publish({
      id: createId("evt"),
      type: "media.asset_uploaded",
      occurredAt: nowIso(),
      payload: { assetId: ready.id, ownerId: ready.ownerId, kind: ready.kind },
    });
  }

  async abortUpload(uploadId: EntityId): Promise<void> {
    const record = this.uploads.get(uploadId);
    if (!record) return;
    await this.storage.delete(record.asset.storageKey);
    this.assets.delete(record.asset.id);
    this.uploads.delete(uploadId);
  }

  /** Fetch an asset by id, or `undefined` when unknown. */
  async getAsset(assetId: EntityId): Promise<MediaAsset | undefined> {
    return this.assets.get(assetId);
  }

  /** Mark an asset deleted and remove its stored object. */
  async deleteAsset(assetId: EntityId): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    await this.storage.delete(asset.storageKey);
    this.assets.set(assetId, { ...asset, state: MediaAssetState.DELETED });
  }

  private requireUpload(uploadId: EntityId): UploadRecord {
    const record = this.uploads.get(uploadId);
    if (!record) {
      throw new CoreError({
        code: ErrorCode.NOT_FOUND,
        message: `Upload ${uploadId} not found.`,
      });
    }
    return record;
  }
}

/**
 * Transform port that immediately marks every requested job complete. Useful
 * for local development where no real image pipeline is available.
 */
export class NoopTransformPort implements TransformPort {
  async requestTransform(assetId: EntityId, spec: TransformSpec): Promise<TransformJob> {
    const now = nowIso();
    return {
      id: createId("xform"),
      assetId,
      spec,
      state: TransformJobState.COMPLETED,
      createdAt: now,
      outputAssetId: assetId,
    };
  }
}

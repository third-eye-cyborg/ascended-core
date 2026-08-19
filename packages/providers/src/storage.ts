/**
 * Object storage port plus a generic in-memory adapter.
 *
 * Vendor-neutral: no cloud storage provider is referenced. URLs produced by
 * the in-memory adapter are synthetic and non-network.
 */

import {
  nowIso,
  HealthState,
  type HealthCheckable,
  type HealthReport,
} from "@third-eye-cyborg/core";

/** A stored object's bytes together with its declared content type. */
export interface StoredObject {
  bytes: Uint8Array;
  contentType: string;
}

/**
 * Object storage port. Implementations persist opaque byte blobs under string
 * keys and can produce a retrieval URL.
 */
export interface ObjectStoragePort {
  /** Store bytes under a key with the given content type. */
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Produce a retrieval URL for a key. */
  getUrl(key: string): Promise<string>;
  /** Delete an object. No-op when absent. */
  delete(key: string): Promise<void>;
  /** Whether an object exists for the key. */
  exists(key: string): Promise<boolean>;
}

/** Options for {@link InMemoryObjectStorage}. */
export interface InMemoryObjectStorageOptions {
  /**
   * Synthetic base URL used to build retrieval URLs. Defaults to a non-network
   * `memory://` scheme so examples never point at a real host.
   */
  baseUrl?: string;
}

/** In-memory {@link ObjectStoragePort} for tests and examples. */
export class InMemoryObjectStorage
  implements ObjectStoragePort, HealthCheckable
{
  private readonly objects = new Map<string, StoredObject>();
  private readonly baseUrl: string;

  constructor(options: InMemoryObjectStorageOptions = {}) {
    this.baseUrl = options.baseUrl ?? "memory://objects";
  }

  async put(
    key: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> {
    this.objects.set(key, { bytes: bytes.slice(), contentType });
  }

  async getUrl(key: string): Promise<string> {
    return `${this.baseUrl}/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  /** Test helper: read stored bytes without a network round-trip. */
  read(key: string): StoredObject | undefined {
    return this.objects.get(key);
  }

  async checkHealth(): Promise<HealthReport> {
    return {
      state: HealthState.HEALTHY,
      checkedAt: nowIso(),
      details: { objects: this.objects.size },
    };
  }
}

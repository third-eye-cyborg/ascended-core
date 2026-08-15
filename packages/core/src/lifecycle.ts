/**
 * Lifecycle and health contracts shared by providers, adapters, and services.
 */

import type { IsoTimestamp } from "./time";

/** Component that requires explicit initialization before use. */
export interface Initializable {
  initialize(): Promise<void>;
}

/** Component that holds resources which must be released. */
export interface Disposable {
  dispose(): Promise<void>;
}

export enum HealthState {
  HEALTHY = "healthy",
  DEGRADED = "degraded",
  UNHEALTHY = "unhealthy",
}

export interface HealthReport {
  state: HealthState;
  /** Human-readable explanation when not healthy. */
  reason?: string;
  /** When the state was last verified. */
  checkedAt: IsoTimestamp;
  /** Redaction-safe structured details. */
  details?: Record<string, unknown>;
}

/** Component that can report its own health. */
export interface HealthCheckable {
  checkHealth(): Promise<HealthReport>;
}

/** Liveness: the process is running. Readiness: it can serve traffic. */
export interface ProbeStatus {
  live: boolean;
  ready: boolean;
  /** Per-component readiness detail keyed by component name. */
  components?: Record<string, HealthReport>;
}

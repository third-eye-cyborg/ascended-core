/**
 * Redaction-safe telemetry field types.
 *
 * Telemetry emitted by privacy-aware code must never carry raw user content.
 * The types here deliberately exclude content-bearing fields, and
 * {@link sanitizeTelemetry} enforces the boundary at runtime by dropping any
 * disallowed keys that slip through (for example "prompt", "content", "body",
 * "text").
 */

import type { IsoTimestamp, Metadata } from "@third-eye-cyborg/ascended-core";

/**
 * Keys that must never appear in telemetry because they typically carry raw
 * user content. {@link sanitizeTelemetry} strips these recursively.
 */
export const FORBIDDEN_TELEMETRY_KEYS: readonly string[] = [
  "prompt",
  "content",
  "body",
  "text",
  "message",
  "input",
  "output",
  "completion",
  "image",
  "imageData",
  "modelData",
];

/**
 * Base shape for all privacy-safe telemetry events. Note the absence of any
 * content-bearing field: this is intentional and enforced.
 */
export interface TelemetryEvent {
  /** ISO-8601 event timestamp. */
  timestamp: IsoTimestamp;
  /** Request id for correlation. */
  requestId: string;
  /** Event category, e.g. "request", "success", "fallback", "blocked". */
  eventType: string;
  /** Generic (vendor-free) provider name that produced the event. */
  provider?: string;
  /** Latency in milliseconds. */
  latencyMs?: number;
  /** Machine-readable reason code (fallback/block reason). */
  reason?: string;
  /** Redaction-safe structured details. Must not carry raw user content. */
  metadata?: Metadata;
}

/**
 * Telemetry payload emitted when a provider call is blocked by privacy
 * enforcement.
 */
export interface BlockedCall extends TelemetryEvent {
  eventType: "blocked";
  /** Generic name of the provider that was attempted. */
  attemptedProvider: string;
  /** Generic family of the provider that was attempted. */
  attemptedFamily: string;
  /** User-safe explanation of why the call was blocked. */
  userMessage: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Recursively strip forbidden content-bearing keys from an arbitrary payload.
 * Returns a new value; the input is never mutated.
 */
export function sanitizeTelemetry<T>(payload: T): T {
  const forbidden = new Set(FORBIDDEN_TELEMETRY_KEYS);

  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    if (isPlainObject(value)) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (forbidden.has(key)) continue;
        result[key] = walk(val);
      }
      return result;
    }
    return value;
  };

  return walk(payload) as T;
}

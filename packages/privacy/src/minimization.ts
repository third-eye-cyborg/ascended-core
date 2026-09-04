/**
 * Data-minimization helpers.
 *
 * These utilities help callers keep only the fields they need and strip
 * identifying data before persistence or telemetry. Consent and jurisdiction
 * routing are exposed as hook points (interfaces / signatures) rather than
 * concrete implementations, so downstream products supply their own compliant
 * logic without this open-source package encoding any real-world policy.
 */

import { createHash } from "node:crypto";

import type { Metadata } from "@third-eye-cyborg/core";

/**
 * Return a shallow copy of `obj` with the given keys replaced by the redaction
 * marker. The input object is not mutated.
 */
export function redactKeys<T extends Record<string, unknown>>(
  obj: T,
  keys: readonly string[],
  marker = "[redacted]",
): T {
  const toRedact = new Set(keys);
  const result: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(result)) {
    if (toRedact.has(key)) {
      result[key] = marker;
    }
  }
  return result as T;
}

/**
 * Return a new object containing only the allow-listed fields present on `obj`.
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  allowlist: readonly string[],
): Partial<T> {
  const allow = new Set(allowlist);
  const result: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    if (allow.has(key)) {
      result[key as keyof T] = obj[key as keyof T];
    }
  }
  return result;
}

/**
 * Produce an opaque, stable tag from a user id so telemetry can correlate
 * events without storing the raw identifier. Not reversible.
 */
export function hashUserId(userId: string, salt = ""): string {
  const digest = createHash("sha256")
    .update(`${salt}:${userId}`)
    .digest("hex");
  return `u_${digest.slice(0, 16)}`;
}

/**
 * Telemetry payload shape accepted by {@link redactTelemetry}: an optional
 * `userId` plus arbitrary redaction-safe metadata.
 */
export interface RedactableTelemetry {
  userId?: string;
  metadata?: Metadata;
  [key: string]: unknown;
}

/**
 * Replace a raw `userId` with an opaque hashed tag. Returns a new object; the
 * input is not mutated.
 */
export function redactTelemetry<T extends RedactableTelemetry>(
  payload: T,
  salt = "",
): Omit<T, "userId"> & { userTag?: string } {
  const { userId, ...rest } = payload;
  const result = { ...rest } as Omit<T, "userId"> & { userTag?: string };
  if (userId !== undefined) {
    result.userTag = hashUserId(userId, salt);
  }
  return result;
}

/**
 * Outcome of a consent evaluation. `required` indicates whether consent must be
 * collected; `granted` reflects a previously recorded decision when known.
 */
export interface ConsentDecision {
  required: boolean;
  granted?: boolean;
  /** Optional machine-readable basis for the decision. */
  basis?: string;
}

/**
 * Hook signature: given a feature and a jurisdiction, decide whether consent is
 * required. This package ships no real jurisdiction logic — supply your own.
 *
 * @param feature the feature being invoked
 * @param jurisdiction an opaque jurisdiction key supplied by the caller
 */
export type IsConsentRequired = (
  feature: string,
  jurisdiction: string,
) => ConsentDecision;

/**
 * Default hook: conservatively requires consent when a jurisdiction is present.
 * Intended to be replaced by downstream products with real logic.
 */
export const isConsentRequired: IsConsentRequired = (_feature, jurisdiction) => ({
  required: jurisdiction.length > 0,
  basis: "default-conservative",
});

/**
 * Hook point for mapping a request context to a jurisdiction and consent
 * decision. Implementations live outside this package.
 */
export interface JurisdictionRouter {
  /** Resolve the jurisdiction key for a request. */
  resolveJurisdiction(input: {
    platform: string;
    metadata?: Metadata;
  }): string;

  /** Decide whether consent is required for a feature in a jurisdiction. */
  evaluateConsent(feature: string, jurisdiction: string): ConsentDecision;
}

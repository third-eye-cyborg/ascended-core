/**
 * Request context passed to policy enforcement and provider operations.
 *
 * The context carries only routing/observability metadata — never raw user
 * content. Raw prompts, message bodies, or generated content must travel
 * through dedicated request payloads, not through the context.
 */

import { createId, nowIso } from "@third-eye-cyborg/core";
import type { IsoTimestamp, Metadata } from "@third-eye-cyborg/core";

import { Platform, PrivacyMode } from "./modes";

/**
 * Metadata about a single request, its user, and its environment.
 */
export interface RequestContext {
  /** Unique request id for tracing/correlation. */
  requestId: string;

  /** User id, omitted for anonymous requests. Never a raw email or name. */
  userId?: string;

  /** Platform the request originates from. */
  platform: Platform;

  /** The user's active privacy mode. */
  privacyMode: PrivacyMode;

  /** Feature invoking the request (e.g. "recommendation"). */
  feature: string;

  /** Optional sub-operation within the feature (e.g. "generation"). */
  operation?: string;

  /** ISO-8601 timestamp of when the request was created. */
  timestamp: IsoTimestamp;

  /**
   * Optional routing/observability metadata. Product-specific vocabularies
   * (spiritual labels, elemental tags, etc.) belong here, never in the
   * contract itself. Must not contain secrets or raw user content.
   */
  metadata?: Metadata;
}

/**
 * Input accepted by {@link createRequestContext}. `requestId` and `timestamp`
 * are generated when omitted.
 */
export interface CreateRequestContextInput {
  feature: string;
  platform: Platform;
  privacyMode: PrivacyMode;
  requestId?: string;
  userId?: string;
  operation?: string;
  timestamp?: IsoTimestamp;
  metadata?: Metadata;
}

/**
 * Build a {@link RequestContext}, generating a request id and timestamp when
 * they are not supplied.
 */
export function createRequestContext(
  input: CreateRequestContextInput,
): RequestContext {
  const context: RequestContext = {
    requestId: input.requestId ?? createId("req"),
    platform: input.platform,
    privacyMode: input.privacyMode,
    feature: input.feature,
    timestamp: input.timestamp ?? nowIso(),
  };

  if (input.userId !== undefined) context.userId = input.userId;
  if (input.operation !== undefined) context.operation = input.operation;
  if (input.metadata !== undefined) context.metadata = input.metadata;

  return context;
}

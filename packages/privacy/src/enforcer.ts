/**
 * Privacy enforcement.
 *
 * The enforcer decides whether a provider call may proceed under the active
 * {@link PrivacyPolicy}. Decisions are purely *family-based* plus a
 * per-provider allow-list — there is no vendor substring matching. When a call
 * is blocked, a typed {@link PrivacyBlockedError} is thrown carrying a
 * user-safe message and a redaction-safe {@link BlockedCall} telemetry
 * payload.
 */

import { CoreError, ErrorCode, nowIso } from "@ascended/core";

import type { RequestContext } from "./context";
import { PrivacyMode } from "./modes";
import type { PrivacyPolicy } from "./policy";
import type { BlockedCall } from "./telemetry";
import { sanitizeTelemetry } from "./telemetry";

/**
 * Error thrown when a provider call is blocked by privacy enforcement.
 * Carries a user-safe message (via {@link CoreError.message}) and the
 * {@link BlockedCall} telemetry payload for observability.
 */
export class PrivacyBlockedError extends CoreError {
  /** Redaction-safe telemetry describing the blocked call. */
  readonly blockedCall: BlockedCall;

  constructor(blockedCall: BlockedCall) {
    super({
      code: ErrorCode.PRIVACY_BLOCKED,
      message: blockedCall.userMessage,
      statusCode: 403,
      context: {
        attemptedProvider: blockedCall.attemptedProvider,
        attemptedFamily: blockedCall.attemptedFamily,
        reason: blockedCall.reason,
      },
    });
    this.name = "PrivacyBlockedError";
    this.blockedCall = blockedCall;
  }

  static isPrivacyBlockedError(value: unknown): value is PrivacyBlockedError {
    return value instanceof PrivacyBlockedError;
  }
}

/**
 * Enforces a {@link PrivacyPolicy} for provider calls.
 */
export class PrivacyPolicyEnforcer {
  #policy: PrivacyPolicy;

  constructor(policy: PrivacyPolicy) {
    this.#policy = policy;
  }

  /**
   * Validate that a provider call is permitted. Returns silently when allowed
   * and throws {@link PrivacyBlockedError} when blocked.
   *
   * @param providerName generic, vendor-free provider name
   * @param providerFamily generic provider family (e.g. "cloud-text", "local")
   * @param context request context for correlation/telemetry
   */
  validateProviderCall(
    providerName: string,
    providerFamily: string,
    context: RequestContext,
  ): void {
    // Per-provider allow-list overrides family blocks.
    if (this.#policy.allowedCloudProviders.includes(providerName)) {
      return;
    }

    if (this.#policy.blockedFamilies.includes(providerFamily)) {
      throw this.#createBlock(providerName, providerFamily, context);
    }
  }

  /** Replace the active policy. */
  updatePolicy(policy: PrivacyPolicy): void {
    this.#policy = policy;
  }

  /** Read the active policy. */
  getPolicy(): Readonly<PrivacyPolicy> {
    return Object.freeze({ ...this.#policy });
  }

  #createBlock(
    attemptedProvider: string,
    attemptedFamily: string,
    context: RequestContext,
  ): PrivacyBlockedError {
    const userMessage =
      this.#policy.blockMessage ??
      (this.#policy.mode === PrivacyMode.HUMAN
        ? "Human mode is active. Automated provider families are not available."
        : `The "${attemptedFamily}" provider family is not available under the current privacy mode.`);

    const blockedCall = sanitizeTelemetry<BlockedCall>({
      timestamp: nowIso(),
      requestId: context.requestId,
      eventType: "blocked",
      provider: attemptedProvider,
      attemptedProvider,
      attemptedFamily,
      reason: "privacy_blocked",
      userMessage,
      metadata: {
        platform: context.platform,
        feature: context.feature,
        privacyMode: this.#policy.mode,
      },
    });

    return new PrivacyBlockedError(blockedCall);
  }
}

/**
 * Convenience factory building an enforcer from a policy.
 */
export function createEnforcer(policy: PrivacyPolicy): PrivacyPolicyEnforcer {
  return new PrivacyPolicyEnforcer(policy);
}

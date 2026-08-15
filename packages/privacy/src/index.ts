/**
 * @ascended/privacy
 *
 * Privacy modes (cloud / private-local / human-only), declarative policy
 * enforcement, data minimization, and redaction-safe telemetry helpers.
 */

export { PrivacyMode, Platform } from "./modes";

export { ProviderFamilies, defaultPolicyForMode } from "./policy";
export type { PrivacyPolicy } from "./policy";

export {
  PrivacyPolicyEnforcer,
  PrivacyBlockedError,
  createEnforcer,
} from "./enforcer";

export { createRequestContext } from "./context";
export type { RequestContext, CreateRequestContextInput } from "./context";

export {
  redactKeys,
  pickFields,
  hashUserId,
  redactTelemetry,
  isConsentRequired,
} from "./minimization";
export type {
  RedactableTelemetry,
  ConsentDecision,
  IsConsentRequired,
  JurisdictionRouter,
} from "./minimization";

export { FORBIDDEN_TELEMETRY_KEYS, sanitizeTelemetry } from "./telemetry";
export type { TelemetryEvent, BlockedCall } from "./telemetry";

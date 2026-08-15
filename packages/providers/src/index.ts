/**
 * @ascended/providers
 *
 * Vendor-neutral provider PORT interfaces plus generic in-memory adapters for
 * tests and examples. No real vendor is referenced anywhere in this package.
 */

export {
  type AuthSession,
  type IssuedSession,
  type SessionStore,
  type AuthProvider,
  type InMemoryAuthProviderOptions,
  InMemorySessionStore,
  InMemoryAuthProvider,
} from "./auth";

export {
  type PolicyActor,
  type PolicyResource,
  type PolicyDecision,
  type PolicyCheckPort,
  type Permission,
  type RolePermissionMap,
  AllowAllPolicy,
  RoleBasedPolicy,
} from "./authorization";

export {
  type StoredObject,
  type ObjectStoragePort,
  type InMemoryObjectStorageOptions,
  InMemoryObjectStorage,
} from "./storage";

export {
  type EmailMessage,
  type DeliveryReceipt,
  type EmailPort,
  RecordingEmailAdapter,
} from "./email";

export {
  type PushTarget,
  type PushPayload,
  type PushReceipt,
  type RecordedPush,
  type PushNotificationPort,
  RecordingPushAdapter,
} from "./push";

export {
  type Entitlement,
  type CreateCheckoutSessionInput,
  type CheckoutSession,
  type BillingWebhookEvent,
  type BillingPort,
  StubBillingAdapter,
} from "./payments";

export {
  type RateLimitDecision,
  type RateLimiterPort,
  type FixedWindowRateLimiterOptions,
  FixedWindowRateLimiter,
} from "./rate-limit";

export {
  type SearchDocument,
  type SearchHit,
  type SearchIndexPort,
  InMemorySearchIndex,
} from "./search";

export {
  type AuditEvent,
  type AuditRecord,
  type AuditLogPort,
  InMemoryAuditLog,
} from "./audit";

export {
  type AiOperation,
  type CapabilityDescriptor,
  type CapabilityAware,
  type TextGenerationRequest,
  type TextGenerationResult,
  type TextGenerationPort,
  type ImageGenerationRequest,
  type ImageGenerationResult,
  type ImageGenerationPort,
  type ThreeDGenerationRequest,
  type ThreeDGenerationResult,
  type ThreeDGenerationPort,
  type RecommendationCandidate,
  type RecommendationRequest,
  type RankedRecommendation,
  type RecommendationPort,
} from "./ai";

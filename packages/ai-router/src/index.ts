/**
 * @ascended/ai-router
 *
 * Provider registry, capability routing, privacy-aware fallbacks, and routing
 * telemetry for AI text / image / 3D / recommendation workloads. All provider
 * families are generic and vendor-free.
 */

// Provider interfaces and shared types
export type {
  ProviderFamily,
  CapabilityDescriptor,
  ProviderTelemetry,
  ProviderResponse,
  BaseProvider,
  TextAIProvider,
  TextOperation,
  TextCompletionRequest,
  TextCompletionResponse,
  TextClassificationRequest,
  TextClassificationResponse,
  TextExtractionRequest,
  TextExtractionResponse,
  ImageAIProvider,
  ImageOperation,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ThreeDProvider,
  ThreeDOperation,
  ThreeDGenerationRequest,
  ThreeDGenerationResponse,
  ThreeDRefineRequest,
  ThreeDRefineResponse,
  ThreeDAnimateResponse,
  ThreeDValidateResponse,
  AIRecommendationProvider,
  HumanRecommendationProvider,
  RecommendationOperation,
  RecommendationRequest,
  RecommendationItem,
  RecommendationResponse,
} from "./providers";

// Registry
export { DefaultProviderRegistry } from "./registry";
export type { ProviderRegistry } from "./registry";

// Capabilities
export {
  ProviderState,
  getBaselineCapability,
  applyHealthToCapability,
  providerStateFromHealth,
} from "./capabilities";
export type {
  ProviderDomain,
  CapabilityQuery,
  CapabilityDescriptorEntry,
  ProviderHealthSnapshot,
} from "./capabilities";

// Router
export {
  RouteReason,
  RouteExhaustedError,
  routeTextCompletion,
  routeImageGeneration,
  route3DTextToModel,
  route3DAnimate,
  routeRecommendation,
} from "./router";
export type { RouteAttempt, RouteResult, RouteOptions } from "./router";

// Synthetic stubs (tests / examples only)
export {
  LocalEchoTextProvider,
  LocalPlaceholderImageProvider,
  LocalStub3DProvider,
  StaticRecommendationProvider,
  HumanOnlyRecommendationProvider,
} from "./stubs";

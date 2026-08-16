/**
 * Provider interfaces for every routed AI domain.
 *
 * Every provider declares a vendor-free `name` and a generic `family` (for
 * example "local", "cloud-text", "cloud-image", "cloud-3d", "human"). The
 * router uses `family` for privacy enforcement so decisions never depend on
 * vendor-specific name substrings.
 */

import type { Metadata } from "@third-eye-cyborg/ascended-core";
import type { Platform, RequestContext } from "@third-eye-cyborg/ascended-privacy";

/**
 * Generic provider family identifiers used by the router. Additional families
 * may be introduced by downstream products; this union documents the built-in
 * ones.
 */
export type ProviderFamily =
  | "local"
  | "cloud-text"
  | "cloud-image"
  | "cloud-3d"
  | "remote-inference"
  | "embeddings"
  | "human";

/**
 * Whether a provider can serve a request on a given platform, plus optional
 * cost/latency hints.
 */
export interface CapabilityDescriptor {
  /** Whether the capability is available. */
  available: boolean;
  /** Human-readable reason when unavailable (or degraded). */
  unavailableReason?: string;
  /** Estimated latency for a typical request, in milliseconds. */
  estimatedLatencyMs?: number;
  /** Whether the capability requires an explicit install/download. */
  requiresExplicitInstall?: boolean;
  /** Estimated download size in bytes when an install is required. */
  downloadSizeBytes?: number;
}

/**
 * Redaction-safe telemetry recorded for a single provider operation.
 */
export interface ProviderTelemetry {
  /** Generic provider name. */
  provider: string;
  /** Generic provider family. */
  family: ProviderFamily;
  /** Request id for correlation. */
  requestId: string;
  /** Event category, e.g. "success", "fallback", "error". */
  eventType: string;
  /** Latency in milliseconds. */
  latencyMs: number;
  /** Optional reason code. */
  reason?: string;
}

/**
 * Standard envelope returned by provider operations.
 */
export interface ProviderResponse<T> {
  /** The successful response payload. */
  data: T;
  /** Whether the response was degraded (fallback/truncated/etc.). */
  degraded: boolean;
  /** Reason for degradation when applicable. */
  degradationReason?: string;
  /** Redaction-safe telemetry to record. */
  telemetry: ProviderTelemetry;
}

/** Base fields shared by all providers. */
export interface BaseProvider {
  /** Vendor-free provider name (e.g. "local-echo", "example-text-provider"). */
  readonly name: string;
  /** Generic provider family used for privacy enforcement. */
  readonly family: ProviderFamily;
}

/**
 * ───────────────────────────── Text ─────────────────────────────
 */

export interface TextCompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface TextCompletionResponse {
  text: string;
  tokensUsed: number;
  stopReason?: string;
}

export interface TextClassificationRequest {
  text: string;
  categories: string[];
  confidence?: boolean;
}

export interface TextClassificationResponse {
  category: string;
  confidence?: number;
  alternatives?: Array<{ category: string; confidence: number }>;
}

export interface TextExtractionRequest {
  text: string;
  schema: Record<string, unknown>;
}

export interface TextExtractionResponse {
  extracted: Record<string, unknown>;
  confidence?: number;
}

export type TextOperation =
  | "completion"
  | "classification"
  | "extraction"
  | "summarization";

/** Text generation / understanding provider. */
export interface TextAIProvider extends BaseProvider {
  checkCapability(
    platform: Platform,
    operation: TextOperation,
  ): Promise<CapabilityDescriptor>;

  completion(
    request: TextCompletionRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<TextCompletionResponse>>;

  classification(
    request: TextClassificationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<TextClassificationResponse>>;

  extraction(
    request: TextExtractionRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<TextExtractionResponse>>;

  /** Optional summarization. */
  summarization?(
    text: string,
    maxLength: number,
    context: RequestContext,
  ): Promise<ProviderResponse<{ summary: string }>>;
}

/**
 * ───────────────────────────── Image ─────────────────────────────
 */

export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  numVariations?: number;
  format?: "url" | "base64" | "file";
}

export interface ImageGenerationResponse {
  images: Array<{ data: string; format: "url" | "base64" }>;
  seed?: number;
}

export type ImageOperation = "generation" | "inpainting" | "upscaling";

/** Image generation provider. */
export interface ImageAIProvider extends BaseProvider {
  checkCapability(
    platform: Platform,
    operation: ImageOperation,
  ): Promise<CapabilityDescriptor>;

  generation(
    request: ImageGenerationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ImageGenerationResponse>>;

  /** Optional inpainting (image + mask → modified image). */
  inpainting?(
    image: string,
    mask: string,
    prompt: string,
    context: RequestContext,
  ): Promise<ProviderResponse<ImageGenerationResponse>>;

  /** Optional upscaling. */
  upscaling?(
    image: string,
    scale: number,
    context: RequestContext,
  ): Promise<ProviderResponse<{ upscaledImage: string }>>;
}

/**
 * ───────────────────────────── 3D ─────────────────────────────
 */

export interface ThreeDGenerationRequest {
  prompt?: string;
  imageData?: string;
  format?: "glb" | "gltf";
}

export interface ThreeDGenerationResponse {
  modelData: string;
  format: "glb" | "gltf";
  metadata?: Metadata;
}

export interface ThreeDRefineRequest {
  modelData: string;
  refinePrompt?: string;
}

export interface ThreeDRefineResponse {
  modelData: string;
  format: "glb" | "gltf";
}

export interface ThreeDAnimateResponse {
  animatedModelData: string;
  metadata?: Metadata;
}

export interface ThreeDValidateResponse {
  valid: boolean;
  issues?: string[];
}

export type ThreeDOperation =
  | "text-to-3d"
  | "image-to-3d"
  | "refine"
  | "animate"
  | "validate-upload";

/** 3D asset generation provider. */
export interface ThreeDProvider extends BaseProvider {
  checkCapability(
    platform: Platform,
    operation: ThreeDOperation,
  ): Promise<CapabilityDescriptor>;

  textTo3D(
    request: ThreeDGenerationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDGenerationResponse>>;

  imageTo3D(
    request: ThreeDGenerationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDGenerationResponse>>;

  refine(
    request: ThreeDRefineRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDRefineResponse>>;

  /** Optional animation / rigging. */
  animate?(
    modelData: string,
    animationPrompt: string,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDAnimateResponse>>;

  validateUpload(
    modelData: string,
    format: "glb" | "gltf",
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDValidateResponse>>;
}

/**
 * ──────────────────────── Recommendation ────────────────────────
 */

export interface RecommendationRequest {
  userId: string;
  limit: number;
  context?: Record<string, unknown>;
}

export interface RecommendationItem {
  id: string;
  title: string;
  score: number;
  personalized: boolean;
}

export interface RecommendationResponse {
  items: RecommendationItem[];
  personalized: boolean;
  degradedReason?: string;
}

export type RecommendationOperation = "ranking" | "search" | "classify";

/** Automated recommendation provider. */
export interface AIRecommendationProvider extends BaseProvider {
  checkCapability(
    platform: Platform,
    operation: RecommendationOperation,
  ): Promise<CapabilityDescriptor>;

  rank(
    request: RecommendationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<RecommendationResponse>>;
}

/** Human / community recommendation provider. */
export interface HumanRecommendationProvider extends BaseProvider {
  readonly family: "human";

  checkCapability(platform: Platform): Promise<CapabilityDescriptor>;

  rank(
    request: RecommendationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<RecommendationResponse>>;
}

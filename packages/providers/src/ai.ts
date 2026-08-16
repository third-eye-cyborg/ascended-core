/**
 * Thin AI generation ports plus a capability-descriptor pattern.
 *
 * Vendor-neutral: no AI vendor is referenced. Example provider identifiers use
 * generic names such as "example-text-provider" or "local-echo".
 */

import type { Metadata } from "@third-eye-cyborg/ascended-core";

/** Abstract operations an AI provider may support. */
export type AiOperation =
  | "text.generate"
  | "image.generate"
  | "three-d.generate"
  | "recommendation.rank";

/**
 * Describes what an AI provider can do on a given platform. Consumers call
 * {@link CapabilityAware.checkCapability} before dispatching work so unsupported
 * operations fail fast rather than at the network boundary.
 */
export interface CapabilityDescriptor {
  /** Whether the operation is supported. */
  supported: boolean;
  /** Abstract provider identifier, e.g. "example-text-provider". */
  provider: string;
  /** Optional reason when unsupported. */
  reason?: string;
  /** Redaction-safe extension point (limits, model tags). */
  metadata?: Metadata;
}

/** A provider that can report which operations it supports on a platform. */
export interface CapabilityAware {
  /**
   * Report whether `operation` is available for `platform`. `platform` is an
   * abstract target identifier (e.g. "web", "mobile").
   */
  checkCapability(
    platform: string,
    operation: AiOperation,
  ): CapabilityDescriptor;
}

/** Request for text generation. */
export interface TextGenerationRequest {
  /** The input prompt. Bodies must never be logged verbatim. */
  prompt: string;
  /** Optional soft cap on output length. */
  maxTokens?: number;
  metadata?: Metadata;
}

/** Result of text generation. */
export interface TextGenerationResult {
  text: string;
  metadata?: Metadata;
}

/** Text generation port. */
export interface TextGenerationPort extends CapabilityAware {
  generateText(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

/** Request for image generation. */
export interface ImageGenerationRequest {
  prompt: string;
  metadata?: Metadata;
}

/** Result of image generation. */
export interface ImageGenerationResult {
  /** Retrieval URL for the produced image (synthetic in examples). */
  url: string;
  metadata?: Metadata;
}

/** Image generation port. */
export interface ImageGenerationPort extends CapabilityAware {
  generateImage(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult>;
}

/** Request for 3D asset generation. */
export interface ThreeDGenerationRequest {
  prompt: string;
  metadata?: Metadata;
}

/** Result of 3D asset generation. */
export interface ThreeDGenerationResult {
  /** Retrieval URL for the produced asset (synthetic in examples). */
  url: string;
  metadata?: Metadata;
}

/** 3D asset generation port. */
export interface ThreeDGenerationPort extends CapabilityAware {
  generateThreeD(
    request: ThreeDGenerationRequest,
  ): Promise<ThreeDGenerationResult>;
}

/** A candidate item to be ranked, referenced by opaque id. */
export interface RecommendationCandidate {
  id: string;
  metadata?: Metadata;
}

/** Request for recommendation ranking. */
export interface RecommendationRequest {
  /** Opaque context (e.g. subject id) the ranking is personalized for. */
  context: string;
  candidates: readonly RecommendationCandidate[];
  metadata?: Metadata;
}

/** A ranked candidate. */
export interface RankedRecommendation {
  id: string;
  score: number;
}

/** Recommendation port. */
export interface RecommendationPort extends CapabilityAware {
  recommend(
    request: RecommendationRequest,
  ): Promise<RankedRecommendation[]>;
}

/**
 * Synthetic provider adapters.
 *
 * These are clearly-labeled, deterministic stand-ins for tests and examples
 * ONLY. They perform no network calls, reference no vendors, and never emit
 * real user data. Do not use them in production.
 */

import type { Platform, RequestContext } from "@third-eye-cyborg/privacy";

import type {
  AIRecommendationProvider,
  CapabilityDescriptor,
  HumanRecommendationProvider,
  ImageAIProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderFamily,
  ProviderResponse,
  ProviderTelemetry,
  RecommendationRequest,
  RecommendationResponse,
  TextAIProvider,
  TextClassificationRequest,
  TextClassificationResponse,
  TextCompletionRequest,
  TextCompletionResponse,
  TextExtractionRequest,
  TextExtractionResponse,
  ThreeDGenerationRequest,
  ThreeDGenerationResponse,
  ThreeDProvider,
  ThreeDRefineRequest,
  ThreeDRefineResponse,
  ThreeDValidateResponse,
} from "./providers";

function telemetry(
  provider: string,
  family: ProviderFamily,
  context: RequestContext,
): ProviderTelemetry {
  return {
    provider,
    family,
    requestId: context.requestId,
    eventType: "success",
    latencyMs: 0,
  };
}

function respond<T>(
  provider: string,
  family: ProviderFamily,
  context: RequestContext,
  data: T,
): ProviderResponse<T> {
  return { data, degraded: false, telemetry: telemetry(provider, family, context) };
}

const availableCapability: CapabilityDescriptor = {
  available: true,
  estimatedLatencyMs: 1,
};

/**
 * Local, deterministic text provider that echoes a synthetic completion.
 * SYNTHETIC — for tests/examples only.
 */
export class LocalEchoTextProvider implements TextAIProvider {
  readonly name = "local-echo";
  readonly family: ProviderFamily = "local";

  async checkCapability(): Promise<CapabilityDescriptor> {
    return availableCapability;
  }

  async completion(
    request: TextCompletionRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<TextCompletionResponse>> {
    const text = `echo:${request.prompt.length}`;
    return respond(this.name, this.family, context, {
      text,
      tokensUsed: text.length,
      stopReason: "eos",
    });
  }

  async classification(
    request: TextClassificationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<TextClassificationResponse>> {
    const category = request.categories[0] ?? "unknown";
    return respond(this.name, this.family, context, { category, confidence: 1 });
  }

  async extraction(
    _request: TextExtractionRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<TextExtractionResponse>> {
    return respond(this.name, this.family, context, { extracted: {} });
  }
}

/**
 * Local placeholder image provider returning a synthetic data-URI.
 * SYNTHETIC — for tests/examples only.
 */
export class LocalPlaceholderImageProvider implements ImageAIProvider {
  readonly name = "local-placeholder-image";
  readonly family: ProviderFamily = "local";

  async checkCapability(): Promise<CapabilityDescriptor> {
    return availableCapability;
  }

  async generation(
    _request: ImageGenerationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ImageGenerationResponse>> {
    return respond(this.name, this.family, context, {
      images: [
        {
          data: "data:image/svg+xml;base64,PHN2Zy8+",
          format: "base64" as const,
        },
      ],
      seed: 0,
    });
  }
}

/**
 * Local stub 3D provider returning synthetic model data.
 * SYNTHETIC — for tests/examples only.
 */
export class LocalStub3DProvider implements ThreeDProvider {
  readonly name = "local-stub-3d";
  readonly family: ProviderFamily = "local";

  async checkCapability(): Promise<CapabilityDescriptor> {
    return availableCapability;
  }

  async textTo3D(
    request: ThreeDGenerationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDGenerationResponse>> {
    return respond(this.name, this.family, context, {
      modelData: "stub-glb",
      format: request.format ?? "glb",
    });
  }

  async imageTo3D(
    request: ThreeDGenerationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDGenerationResponse>> {
    return respond(this.name, this.family, context, {
      modelData: "stub-glb",
      format: request.format ?? "glb",
    });
  }

  async refine(
    request: ThreeDRefineRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDRefineResponse>> {
    return respond(this.name, this.family, context, {
      modelData: request.modelData,
      format: "glb",
    });
  }

  async validateUpload(
    _modelData: string,
    _format: "glb" | "gltf",
    context: RequestContext,
  ): Promise<ProviderResponse<ThreeDValidateResponse>> {
    return respond(this.name, this.family, context, { valid: true });
  }
}

/**
 * Deterministic AI recommendation provider returning static synthetic items.
 * SYNTHETIC — for tests/examples only.
 */
export class StaticRecommendationProvider implements AIRecommendationProvider {
  readonly name = "static-recommender";
  readonly family: ProviderFamily = "cloud-text";

  async checkCapability(): Promise<CapabilityDescriptor> {
    return availableCapability;
  }

  async rank(
    request: RecommendationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<RecommendationResponse>> {
    const items = Array.from({ length: request.limit }, (_v, i) => ({
      id: `item_${i}`,
      title: `Sample Item ${i}`,
      score: 1 - i / Math.max(request.limit, 1),
      personalized: true,
    }));
    return respond(this.name, this.family, context, {
      items,
      personalized: true,
    });
  }
}

/**
 * Human/community recommendation provider returning non-personalized items.
 * SYNTHETIC — for tests/examples only.
 */
export class HumanOnlyRecommendationProvider
  implements HumanRecommendationProvider
{
  readonly name = "community-ranker";
  readonly family = "human" as const;

  async checkCapability(_platform: Platform): Promise<CapabilityDescriptor> {
    return availableCapability;
  }

  async rank(
    request: RecommendationRequest,
    context: RequestContext,
  ): Promise<ProviderResponse<RecommendationResponse>> {
    const items = Array.from({ length: request.limit }, (_v, i) => ({
      id: `community_${i}`,
      title: `Community Pick ${i}`,
      score: 0.5,
      personalized: false,
    }));
    return {
      data: {
        items,
        personalized: false,
        degradedReason: "human_fallback",
      },
      degraded: true,
      degradationReason: "human_fallback",
      telemetry: {
        provider: this.name,
        family: this.family,
        requestId: context.requestId,
        eventType: "fallback",
        latencyMs: 0,
        reason: "human_fallback",
      },
    };
  }
}

import {
  createRequestContext,
  defaultPolicyForMode,
  Platform,
  PrivacyMode,
  PrivacyPolicyEnforcer,
} from "@third-eye-cyborg/privacy";
import type { RequestContext } from "@third-eye-cyborg/privacy";
import { describe, it, expect } from "vitest";

import {
  LocalEchoTextProvider,
  LocalPlaceholderImageProvider,
  LocalStub3DProvider,
  HumanOnlyRecommendationProvider,
  RouteExhaustedError,
  RouteReason,
  route3DTextToModel,
  routeImageGeneration,
  routeRecommendation,
  routeTextCompletion,
  StaticRecommendationProvider,
} from "../src/index";
import type {
  CapabilityDescriptor,
  ProviderFamily,
  ProviderResponse,
  RecommendationRequest,
  RecommendationResponse,
  TextAIProvider,
  TextClassificationResponse,
  TextCompletionResponse,
  TextExtractionResponse,
} from "../src/index";

function ctx(mode: PrivacyMode): RequestContext {
  return createRequestContext({
    feature: "text",
    platform: Platform.WEB,
    privacyMode: mode,
    userId: "user_example",
  });
}

/** SYNTHETIC degraded text provider whose capability check reports unavailable. */
class DegradedTextProvider implements TextAIProvider {
  readonly name = "degraded-text";
  readonly family: ProviderFamily = "local";
  async checkCapability(): Promise<CapabilityDescriptor> {
    return { available: false, unavailableReason: "degraded" };
  }
  async completion(): Promise<ProviderResponse<TextCompletionResponse>> {
    throw new Error("should not be called");
  }
  async classification(): Promise<
    ProviderResponse<TextClassificationResponse>
  > {
    throw new Error("nope");
  }
  async extraction(): Promise<ProviderResponse<TextExtractionResponse>> {
    throw new Error("nope");
  }
}

/** SYNTHETIC cloud provider that hangs, used to exercise timeout handling. */
class HangingCloudTextProvider implements TextAIProvider {
  readonly name = "example-text-provider";
  readonly family: ProviderFamily = "cloud-text";
  async checkCapability(): Promise<CapabilityDescriptor> {
    return { available: true };
  }
  async completion(): Promise<ProviderResponse<TextCompletionResponse>> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    throw new Error("should have timed out");
  }
  async classification(): Promise<
    ProviderResponse<TextClassificationResponse>
  > {
    throw new Error("nope");
  }
  async extraction(): Promise<ProviderResponse<TextExtractionResponse>> {
    throw new Error("nope");
  }
}

describe("routeTextCompletion", () => {
  it("falls through a degraded provider to a healthy one", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    const result = await routeTextCompletion(
      [new DegradedTextProvider(), new LocalEchoTextProvider()],
      enforcer,
      { prompt: "hello" },
      ctx(PrivacyMode.CLOUD),
    );

    expect(result.selectedProvider).toBe("local-echo");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.success).toBe(false);
    expect(result.attempts[0]?.reason).toBe("degraded");
    expect(result.attempts[1]?.success).toBe(true);
    expect(result.response.data.text.startsWith("echo:")).toBe(true);
  });

  it("privacy blocks a cloud provider in private-local and records the reason", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL),
    );
    const result = await routeTextCompletion(
      [new HangingCloudTextProvider(), new LocalEchoTextProvider()],
      enforcer,
      { prompt: "hello" },
      ctx(PrivacyMode.PRIVATE_LOCAL),
    );

    expect(result.selectedProvider).toBe("local-echo");
    const blocked = result.attempts.find(
      (a) => a.provider === "example-text-provider",
    );
    expect(blocked?.success).toBe(false);
    expect(blocked?.reason).toBe(RouteReason.PRIVACY_BLOCKED);
  });

  it("records provider_timeout when a provider exceeds timeoutMs", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    const result = await routeTextCompletion(
      [new HangingCloudTextProvider(), new LocalEchoTextProvider()],
      enforcer,
      { prompt: "hello" },
      ctx(PrivacyMode.CLOUD),
      { timeoutMs: 20 },
    );

    expect(result.selectedProvider).toBe("local-echo");
    const timed = result.attempts.find(
      (a) => a.provider === "example-text-provider",
    );
    expect(timed?.reason).toBe(RouteReason.PROVIDER_TIMEOUT);
  });

  it("throws RouteExhaustedError when all providers fail", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    await expect(
      routeTextCompletion(
        [new DegradedTextProvider()],
        enforcer,
        { prompt: "hello" },
        ctx(PrivacyMode.CLOUD),
      ),
    ).rejects.toBeInstanceOf(RouteExhaustedError);
  });
});

describe("routeImageGeneration", () => {
  it("returns a synthetic image from the local placeholder provider", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    const result = await routeImageGeneration(
      [new LocalPlaceholderImageProvider()],
      enforcer,
      { prompt: "a circle" },
      ctx(PrivacyMode.CLOUD),
    );
    expect(result.selectedProvider).toBe("local-placeholder-image");
    expect(result.response.data.images.length).toBe(1);
  });
});

describe("route3DTextToModel", () => {
  it("returns stub model data from the local 3D provider", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    const result = await route3DTextToModel(
      [new LocalStub3DProvider()],
      enforcer,
      { prompt: "a cube" },
      ctx(PrivacyMode.CLOUD),
    );
    expect(result.selectedProvider).toBe("local-stub-3d");
    expect(result.response.data.modelData).toBe("stub-glb");
  });
});

describe("routeRecommendation", () => {
  const request: RecommendationRequest = { userId: "user_example", limit: 3 };

  it("falls back from AI to human provider when AI is privacy-blocked", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.PRIVATE_LOCAL),
    );
    const result = await routeRecommendation(
      [new StaticRecommendationProvider()],
      [new HumanOnlyRecommendationProvider()],
      enforcer,
      request,
      ctx(PrivacyMode.PRIVATE_LOCAL),
    );

    expect(result.selectedProvider).toBe("community-ranker");
    const data: RecommendationResponse = result.response.data;
    expect(data.personalized).toBe(false);
    expect(data.items).toHaveLength(3);
    const aiAttempt = result.attempts.find(
      (a) => a.provider === "static-recommender",
    );
    expect(aiAttempt?.reason).toBe(RouteReason.PRIVACY_BLOCKED);
  });

  it("uses the AI provider first in cloud mode", async () => {
    const enforcer = new PrivacyPolicyEnforcer(
      defaultPolicyForMode(PrivacyMode.CLOUD),
    );
    const result = await routeRecommendation(
      [new StaticRecommendationProvider()],
      [new HumanOnlyRecommendationProvider()],
      enforcer,
      request,
      ctx(PrivacyMode.CLOUD),
    );

    expect(result.selectedProvider).toBe("static-recommender");
    expect(result.response.data.personalized).toBe(true);
  });
});

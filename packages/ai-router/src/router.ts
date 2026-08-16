/**
 * Router orchestrator with deterministic provider selection and fallback.
 *
 * For each routed operation the router:
 * 1. enforces privacy (family-based) BEFORE any provider dispatch,
 * 2. checks the provider capability,
 * 3. dispatches with a per-provider timeout,
 * 4. records ordered {@link RouteAttempt}s for observability, and
 * 5. falls through to the next provider on failure.
 */

import { CoreError, ErrorCode } from "@third-eye-cyborg/ascended-core";
import { PrivacyBlockedError } from "@third-eye-cyborg/ascended-privacy";
import type { PrivacyPolicyEnforcer, RequestContext } from "@third-eye-cyborg/ascended-privacy";

import type { CapabilityDescriptor } from "./providers";
import type {
  AIRecommendationProvider,
  HumanRecommendationProvider,
  ImageAIProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ProviderResponse,
  RecommendationRequest,
  RecommendationResponse,
  TextAIProvider,
  TextCompletionRequest,
  TextCompletionResponse,
  ThreeDAnimateResponse,
  ThreeDGenerationRequest,
  ThreeDGenerationResponse,
  ThreeDProvider,
} from "./providers";

/** Machine-readable reason codes for a failed or skipped attempt. */
export enum RouteReason {
  PRIVACY_BLOCKED = "privacy_blocked",
  CAPABILITY_UNAVAILABLE = "capability_unavailable",
  PROVIDER_UNAVAILABLE = "provider_unavailable",
  PROVIDER_TIMEOUT = "provider_timeout",
  PROVIDER_ERROR = "provider_error",
}

/** Result of attempting a single provider. */
export interface RouteAttempt {
  provider: string;
  family: string;
  success: boolean;
  reason?: RouteReason | string;
}

/** Final routing result including the ordered attempt log. */
export interface RouteResult<T> {
  response: ProviderResponse<T>;
  attempts: RouteAttempt[];
  selectedProvider: string;
}

export interface RouteOptions {
  /** Per-provider timeout in milliseconds. Defaults to 12000. */
  timeoutMs?: number;
}

/** Thrown when every candidate provider fails. Carries the attempt log. */
export class RouteExhaustedError extends CoreError {
  readonly attempts: RouteAttempt[];

  constructor(attempts: RouteAttempt[]) {
    const last = attempts.at(-1)?.reason ?? RouteReason.PROVIDER_UNAVAILABLE;
    super({
      code: ErrorCode.UNAVAILABLE,
      message: `All providers failed. Last reason: ${String(last)}`,
      context: { attempts: attempts.length, lastReason: String(last) },
    });
    this.name = "RouteExhaustedError";
    this.attempts = attempts;
  }
}

const TIMEOUT_MARKER = Symbol("route-timeout");

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  if (timeoutMs <= 0) return promise;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(TIMEOUT_MARKER), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Internal candidate description. `check` performs privacy + capability
 * validation and `execute` dispatches the operation.
 */
interface Candidate<T> {
  name: string;
  family: string;
  check: () => Promise<CapabilityDescriptor>;
  execute: () => Promise<ProviderResponse<T>>;
}

async function attemptCandidates<T>(
  candidates: Array<Candidate<T>>,
  options: RouteOptions,
): Promise<RouteResult<T>> {
  const attempts: RouteAttempt[] = [];
  const timeoutMs = options.timeoutMs ?? 12_000;

  for (const candidate of candidates) {
    let capability: CapabilityDescriptor;
    try {
      capability = await candidate.check();
    } catch (error) {
      attempts.push({
        provider: candidate.name,
        family: candidate.family,
        success: false,
        reason: PrivacyBlockedError.isPrivacyBlockedError(error)
          ? RouteReason.PRIVACY_BLOCKED
          : RouteReason.CAPABILITY_UNAVAILABLE,
      });
      continue;
    }

    if (!capability.available) {
      attempts.push({
        provider: candidate.name,
        family: candidate.family,
        success: false,
        reason:
          capability.unavailableReason ?? RouteReason.CAPABILITY_UNAVAILABLE,
      });
      continue;
    }

    try {
      const response = await withTimeout(candidate.execute(), timeoutMs);
      attempts.push({
        provider: candidate.name,
        family: candidate.family,
        success: true,
      });
      return { response, attempts, selectedProvider: candidate.name };
    } catch (error) {
      attempts.push({
        provider: candidate.name,
        family: candidate.family,
        success: false,
        reason:
          error === TIMEOUT_MARKER
            ? RouteReason.PROVIDER_UNAVAILABLE
            : RouteReason.PROVIDER_ERROR,
      });
    }
  }

  throw new RouteExhaustedError(attempts);
}

/** Route a text completion across ordered providers. */
export async function routeTextCompletion(
  providers: TextAIProvider[],
  enforcer: PrivacyPolicyEnforcer,
  request: TextCompletionRequest,
  context: RequestContext,
  options: RouteOptions = {},
): Promise<RouteResult<TextCompletionResponse>> {
  return attemptCandidates(
    providers.map((provider) => ({
      name: provider.name,
      family: provider.family,
      check: async () => {
        enforcer.validateProviderCall(
          provider.name,
          provider.family,
          context,
        );
        return provider.checkCapability(context.platform, "completion");
      },
      execute: async () => provider.completion(request, context),
    })),
    options,
  );
}

/** Route an image generation across ordered providers. */
export async function routeImageGeneration(
  providers: ImageAIProvider[],
  enforcer: PrivacyPolicyEnforcer,
  request: ImageGenerationRequest,
  context: RequestContext,
  options: RouteOptions = {},
): Promise<RouteResult<ImageGenerationResponse>> {
  return attemptCandidates(
    providers.map((provider) => ({
      name: provider.name,
      family: provider.family,
      check: async () => {
        enforcer.validateProviderCall(
          provider.name,
          provider.family,
          context,
        );
        return provider.checkCapability(context.platform, "generation");
      },
      execute: async () => provider.generation(request, context),
    })),
    options,
  );
}

/** Route a text-to-3D generation across ordered providers. */
export async function route3DTextToModel(
  providers: ThreeDProvider[],
  enforcer: PrivacyPolicyEnforcer,
  request: ThreeDGenerationRequest,
  context: RequestContext,
  options: RouteOptions = {},
): Promise<RouteResult<ThreeDGenerationResponse>> {
  return attemptCandidates(
    providers.map((provider) => ({
      name: provider.name,
      family: provider.family,
      check: async () => {
        enforcer.validateProviderCall(
          provider.name,
          provider.family,
          context,
        );
        return provider.checkCapability(context.platform, "text-to-3d");
      },
      execute: async () => provider.textTo3D(request, context),
    })),
    options,
  );
}

/** Route a 3D animation across ordered providers. */
export async function route3DAnimate(
  providers: ThreeDProvider[],
  enforcer: PrivacyPolicyEnforcer,
  request: { modelData: string; animationPrompt: string },
  context: RequestContext,
  options: RouteOptions = {},
): Promise<RouteResult<ThreeDAnimateResponse>> {
  return attemptCandidates(
    providers.map((provider) => ({
      name: provider.name,
      family: provider.family,
      check: async () => {
        enforcer.validateProviderCall(
          provider.name,
          provider.family,
          context,
        );
        if (!provider.animate) {
          return {
            available: false,
            unavailableReason: "Animate operation not implemented",
          };
        }
        return provider.checkCapability(context.platform, "animate");
      },
      execute: async () => {
        if (!provider.animate) {
          throw new CoreError({
            code: ErrorCode.UNSUPPORTED,
            message: "Animate operation not implemented",
          });
        }
        return provider.animate(
          request.modelData,
          request.animationPrompt,
          context,
        );
      },
    })),
    options,
  );
}

/**
 * Route a recommendation. AI providers are attempted first; on exhaustion the
 * router falls through to human/community providers.
 */
export async function routeRecommendation(
  aiProviders: AIRecommendationProvider[],
  humanProviders: HumanRecommendationProvider[],
  enforcer: PrivacyPolicyEnforcer,
  request: RecommendationRequest,
  context: RequestContext,
  options: RouteOptions = {},
): Promise<RouteResult<RecommendationResponse>> {
  const candidates: Array<Candidate<RecommendationResponse>> = [
    ...aiProviders.map((provider) => ({
      name: provider.name,
      family: provider.family,
      check: async () => {
        enforcer.validateProviderCall(
          provider.name,
          provider.family,
          context,
        );
        return provider.checkCapability(context.platform, "ranking");
      },
      execute: async () => provider.rank(request, context),
    })),
    ...humanProviders.map((provider) => ({
      name: provider.name,
      family: provider.family as string,
      check: async () => {
        enforcer.validateProviderCall(
          provider.name,
          provider.family,
          context,
        );
        return provider.checkCapability(context.platform);
      },
      execute: async () => provider.rank(request, context),
    })),
  ];

  return attemptCandidates(candidates, options);
}

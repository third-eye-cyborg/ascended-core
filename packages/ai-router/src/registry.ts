/**
 * Provider registry.
 *
 * Providers are keyed by domain. Registration uses name-based replace
 * semantics: registering a provider whose `name` already exists replaces the
 * previous entry rather than duplicating it.
 */

import type {
  AIRecommendationProvider,
  HumanRecommendationProvider,
  ImageAIProvider,
  TextAIProvider,
  ThreeDProvider,
} from "./providers";

/**
 * Registry contract for all provider domains.
 */
export interface ProviderRegistry {
  registerTextProvider(provider: TextAIProvider): void;
  getTextProviders(): TextAIProvider[];

  registerImageProvider(provider: ImageAIProvider): void;
  getImageProviders(): ImageAIProvider[];

  register3DProvider(provider: ThreeDProvider): void;
  get3DProviders(): ThreeDProvider[];

  registerAIRecommendationProvider(provider: AIRecommendationProvider): void;
  getAIRecommendationProviders(): AIRecommendationProvider[];

  registerHumanRecommendationProvider(
    provider: HumanRecommendationProvider,
  ): void;
  getHumanRecommendationProviders(): HumanRecommendationProvider[];
}

function upsertByName<T extends { name: string }>(list: T[], provider: T): T[] {
  if (!provider.name) {
    throw new Error("Provider must have a name");
  }
  return [...list.filter((p) => p.name !== provider.name), provider];
}

/**
 * In-memory {@link ProviderRegistry} with name-based replace semantics.
 */
export class DefaultProviderRegistry implements ProviderRegistry {
  #text: TextAIProvider[] = [];
  #image: ImageAIProvider[] = [];
  #threeD: ThreeDProvider[] = [];
  #aiRec: AIRecommendationProvider[] = [];
  #humanRec: HumanRecommendationProvider[] = [];

  registerTextProvider(provider: TextAIProvider): void {
    this.#text = upsertByName(this.#text, provider);
  }

  getTextProviders(): TextAIProvider[] {
    return [...this.#text];
  }

  registerImageProvider(provider: ImageAIProvider): void {
    this.#image = upsertByName(this.#image, provider);
  }

  getImageProviders(): ImageAIProvider[] {
    return [...this.#image];
  }

  register3DProvider(provider: ThreeDProvider): void {
    this.#threeD = upsertByName(this.#threeD, provider);
  }

  get3DProviders(): ThreeDProvider[] {
    return [...this.#threeD];
  }

  registerAIRecommendationProvider(provider: AIRecommendationProvider): void {
    this.#aiRec = upsertByName(this.#aiRec, provider);
  }

  getAIRecommendationProviders(): AIRecommendationProvider[] {
    return [...this.#aiRec];
  }

  registerHumanRecommendationProvider(
    provider: HumanRecommendationProvider,
  ): void {
    this.#humanRec = upsertByName(this.#humanRec, provider);
  }

  getHumanRecommendationProviders(): HumanRecommendationProvider[] {
    return [...this.#humanRec];
  }
}

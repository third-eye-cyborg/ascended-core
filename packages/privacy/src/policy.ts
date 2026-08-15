/**
 * Privacy policy contracts and mode-based defaults.
 *
 * Policies are expressed in terms of generic *provider families* (for example
 * "cloud-text", "cloud-image", "cloud-3d", "remote-inference", "embeddings")
 * rather than vendor names, so enforcement stays declarative and portable.
 */

import { PrivacyMode } from "./modes";

/**
 * Well-known generic provider family identifiers.
 *
 * This is a non-exhaustive convenience list; policies accept arbitrary family
 * strings so downstream products can define their own families via the same
 * mechanism.
 */
export const ProviderFamilies = {
  /** On-device / local inference. Never leaves the device. */
  LOCAL: "local",
  /** Remote text generation / completion family. */
  CLOUD_TEXT: "cloud-text",
  /** Remote image generation family. */
  CLOUD_IMAGE: "cloud-image",
  /** Remote 3D asset generation family. */
  CLOUD_3D: "cloud-3d",
  /** Generic remote inference family (arbitrary model calls). */
  REMOTE_INFERENCE: "remote-inference",
  /** Remote embeddings / vectorization family. */
  EMBEDDINGS: "embeddings",
  /** Human / community sourced results. */
  HUMAN: "human",
} as const;

/**
 * Declarative privacy policy evaluated by {@link PrivacyPolicyEnforcer}.
 */
export interface PrivacyPolicy {
  /** Privacy mode to enforce. */
  mode: PrivacyMode;

  /**
   * Provider *names* explicitly permitted even when their family is blocked.
   * Use sparingly; this is the per-provider escape hatch.
   */
  allowedCloudProviders: string[];

  /**
   * Provider *families* that are blocked under this policy (for example
   * "cloud-text", "embeddings", "remote-inference", "cloud-3d").
   */
  blockedFamilies: string[];

  /** Optional user-visible message shown when a call is blocked. */
  blockMessage?: string;
}

const CLOUD_FAMILIES: readonly string[] = [
  ProviderFamilies.CLOUD_TEXT,
  ProviderFamilies.CLOUD_IMAGE,
  ProviderFamilies.CLOUD_3D,
  ProviderFamilies.REMOTE_INFERENCE,
  ProviderFamilies.EMBEDDINGS,
];

/**
 * Produce a sensible default policy for a given privacy mode.
 *
 * - `CLOUD`: nothing blocked.
 * - `PRIVATE_LOCAL`: all cloud families blocked; local remains available.
 * - `HUMAN`: every non-human family blocked.
 */
export function defaultPolicyForMode(mode: PrivacyMode): PrivacyPolicy {
  switch (mode) {
    case PrivacyMode.CLOUD:
      return {
        mode,
        allowedCloudProviders: [],
        blockedFamilies: [],
      };
    case PrivacyMode.PRIVATE_LOCAL:
      return {
        mode,
        allowedCloudProviders: [],
        blockedFamilies: [...CLOUD_FAMILIES],
        blockMessage:
          "Cloud provider families are not available in Private Local mode. Use a local provider instead.",
      };
    case PrivacyMode.HUMAN:
      return {
        mode,
        allowedCloudProviders: [],
        blockedFamilies: [
          ...CLOUD_FAMILIES,
          ProviderFamilies.LOCAL,
        ],
        blockMessage:
          "Human mode is active. Automated provider families are not available.",
      };
    default: {
      // Exhaustiveness guard.
      const _never: never = mode;
      return _never;
    }
  }
}

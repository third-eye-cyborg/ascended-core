/**
 * A synthetic {@link TextGenerationPort} implementation.
 *
 * This is the reference for how a downstream adopter implements an AI provider
 * port: deterministic, offline, and redaction-safe (prompts are never logged
 * or echoed back verbatim). Real vendor adapters live in your private product
 * repo, not in Core.
 */

import type { Metadata } from "@ascended/core";
import type {
  AiOperation,
  CapabilityDescriptor,
  TextGenerationPort,
  TextGenerationRequest,
  TextGenerationResult,
} from "@ascended/providers";

/** Abstract provider identifier reported in capability descriptors. */
export const SYNTHETIC_TEXT_PROVIDER_ID = "synthetic-text";

/**
 * Deterministic text "generation": derives a stable summary-style string from
 * the prompt length and a simple hash, so tests and demos are reproducible.
 */
export class SyntheticTextGenerator implements TextGenerationPort {
  /** Number of generation calls served, exposed for assertions in tests. */
  get callCount(): number {
    return this.calls;
  }

  private calls = 0;

  checkCapability(_platform: string, operation: AiOperation): CapabilityDescriptor {
    if (operation === "text.generate") {
      return {
        supported: true,
        provider: SYNTHETIC_TEXT_PROVIDER_ID,
        metadata: { deterministic: true } satisfies Metadata,
      };
    }
    return {
      supported: false,
      provider: SYNTHETIC_TEXT_PROVIDER_ID,
      reason: `operation "${operation}" is not implemented by the synthetic adapter`,
    };
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResult> {
    this.calls += 1;
    const cap = request.maxTokens ?? 32;
    const hash = stableHash(request.prompt);
    const text = `synthetic-summary-${hash.toString(16)}`.slice(0, Math.max(8, cap));
    return { text, metadata: { provider: SYNTHETIC_TEXT_PROVIDER_ID } };
  }
}

/** Tiny FNV-style hash so output varies with input but stays deterministic. */
function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

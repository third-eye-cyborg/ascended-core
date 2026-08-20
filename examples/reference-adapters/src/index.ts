/**
 * `@third-eye-cyborg/example-reference-adapters`
 *
 * Synthetic adapter implementations wired end-to-end against Core's ports,
 * for demos and integration tests. Everything is offline and deterministic.
 */

export {
  SyntheticBillingAdapter,
  SYNTHETIC_CHECKOUT_BASE_URL,
} from "./adapters/synthetic-billing.js";
export {
  SyntheticTextGenerator,
  SYNTHETIC_TEXT_PROVIDER_ID,
} from "./adapters/synthetic-text-generation.js";
export {
  createReferencePlatform,
  feedTopic,
  type PublishPostInput,
  type ReferencePlatform,
} from "./platform.js";

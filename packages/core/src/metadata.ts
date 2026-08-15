/**
 * Extension metadata. Product-specific vocabularies (for example spiritual
 * labels such as chakra alignments or elemental tags) travel through
 * `metadata` extension points instead of being hard-coded into Core types.
 */

/** Free-form, JSON-serializable metadata bag. Values must never contain secrets. */
export type Metadata = Record<string, unknown>;

/** Adds an optional metadata extension point to a contract. */
export type Extensible<T> = T & { metadata?: Metadata };

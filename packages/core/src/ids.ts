/**
 * Entity identifiers. All Core contracts use opaque, prefixed string IDs so
 * that producers and consumers never depend on a specific database sequence
 * or UUID strategy.
 */

import { randomBytes } from "node:crypto";

/** Opaque entity identifier, e.g. "acct_01HF8…" */
export type EntityId = string & { readonly __brand: "EntityId" };

const ID_PATTERN = /^[a-z][a-z0-9]*_[A-Za-z0-9_-]{8,64}$/;

/**
 * Create a new opaque entity id with a lowercase prefix, e.g.
 * `createId("post")` → `post_9f2ab1c7d44e`.
 */
export function createId(prefix: string): EntityId {
  if (!/^[a-z][a-z0-9]*$/.test(prefix)) {
    throw new Error(
      `Invalid id prefix "${prefix}". Prefixes must be lowercase alphanumeric and start with a letter.`,
    );
  }
  return `${prefix}_${randomBytes(12).toString("base64url")}` as EntityId;
}

/** Type guard for the canonical Core id shape. */
export function isEntityId(value: unknown): value is EntityId {
  return typeof value === "string" && ID_PATTERN.test(value);
}

/** Extract the prefix portion of an id (text before the first underscore). */
export function idPrefix(id: EntityId): string {
  const idx = id.indexOf("_");
  return idx === -1 ? id : id.slice(0, idx);
}

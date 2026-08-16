/**
 * Repository and pagination contracts.
 *
 * Storage-agnostic: no SQL, no schema, no vendor. Entities are only required
 * to carry an opaque `id`.
 */

import type { EntityId } from "@third-eye-cyborg/ascended-core";

/** The minimal shape a repository entity must satisfy. */
export interface Entity {
  id: EntityId;
}

/** Cursor-based pagination request. */
export interface CursorPagination {
  /** Opaque cursor returned by a previous page. Absent means start. */
  cursor?: string;
  /** Maximum number of items to return. */
  limit: number;
}

/** A page of results with an optional cursor to fetch the next page. */
export interface Page<T> {
  /** The items in this page. */
  items: T[];
  /** Cursor for the next page, or `undefined` when exhausted. */
  nextCursor?: string;
}

/**
 * Abstract filter passed to {@link Repository.findMany}. Interpretation is
 * adapter-specific; a partial match over entity fields is the common default.
 */
export type Filter<T> = Partial<T>;

/**
 * Generic repository contract. Implementations may be backed by any store; the
 * in-memory implementation in this package is for tests and examples.
 */
export interface Repository<T extends Entity> {
  /** Resolve an entity by id, or `null` when absent. */
  findById(id: EntityId): Promise<T | null>;
  /** List entities matching an optional filter with cursor pagination. */
  findMany(filter?: Filter<T>, pagination?: CursorPagination): Promise<Page<T>>;
  /** Persist a new entity. */
  create(entity: T): Promise<T>;
  /** Apply a partial update to an existing entity by id. */
  update(id: EntityId, patch: Partial<T>): Promise<T>;
  /** Remove an entity by id. */
  delete(id: EntityId): Promise<void>;
}

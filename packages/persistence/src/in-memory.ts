/**
 * In-memory Repository and UnitOfWork for tests and examples.
 *
 * No production storage, no schema. Ordering is stable by (createdAt, id) so
 * cursor pagination is deterministic.
 */

import {
  CoreError,
  ErrorCode,
  nowIso,
  type EntityId,
  type IsoTimestamp,
} from "@third-eye-cyborg/ascended-core";
import type {
  CursorPagination,
  Entity,
  Filter,
  Page,
  Repository,
} from "./repository";
import type { TransactionContext, UnitOfWork } from "./unit-of-work";

interface StoredEntity<T> {
  value: T;
  createdAt: IsoTimestamp;
  /** Monotonic sequence used to break createdAt ties deterministically. */
  seq: number;
}

/** Options for {@link InMemoryRepository}. */
export interface InMemoryRepositoryOptions {
  /** Injectable clock for deterministic createdAt ordering. */
  now?: () => IsoTimestamp;
}

/**
 * In-memory {@link Repository}. Items are ordered by insertion time then
 * sequence so pagination is stable even when timestamps collide.
 */
export class InMemoryRepository<T extends Entity> implements Repository<T> {
  private readonly items = new Map<EntityId, StoredEntity<T>>();
  private readonly now: () => IsoTimestamp;
  private seqCounter = 0;

  constructor(options: InMemoryRepositoryOptions = {}) {
    this.now = options.now ?? nowIso;
  }

  async findById(id: EntityId): Promise<T | null> {
    const stored = this.items.get(id);
    return stored === undefined ? null : clone(stored.value);
  }

  async findMany(
    filter?: Filter<T>,
    pagination?: CursorPagination,
  ): Promise<Page<T>> {
    const ordered = [...this.items.values()]
      .filter((stored) => matchesFilter(stored.value, filter))
      .sort(compareStored);

    const limit = pagination?.limit ?? ordered.length;
    if (limit < 0) {
      throw new CoreError({
        code: ErrorCode.VALIDATION,
        message: "pagination.limit must be non-negative",
      });
    }

    let startIndex = 0;
    if (pagination?.cursor !== undefined) {
      const cursorIdx = ordered.findIndex(
        (stored) => cursorFor(stored) === pagination.cursor,
      );
      if (cursorIdx === -1) {
        throw new CoreError({
          code: ErrorCode.VALIDATION,
          message: "unknown pagination cursor",
        });
      }
      startIndex = cursorIdx + 1;
    }

    const slice = ordered.slice(startIndex, startIndex + limit);
    const page: Page<T> = { items: slice.map((s) => clone(s.value)) };
    const lastConsumed = startIndex + slice.length;
    const last = slice[slice.length - 1];
    if (last !== undefined && lastConsumed < ordered.length) {
      page.nextCursor = cursorFor(last);
    }
    return page;
  }

  async create(entity: T): Promise<T> {
    if (this.items.has(entity.id)) {
      throw new CoreError({
        code: ErrorCode.CONFLICT,
        message: `entity already exists: ${entity.id}`,
      });
    }
    const stored: StoredEntity<T> = {
      value: clone(entity),
      createdAt: this.now(),
      seq: this.seqCounter++,
    };
    this.items.set(entity.id, stored);
    return clone(stored.value);
  }

  async update(id: EntityId, patch: Partial<T>): Promise<T> {
    const stored = this.items.get(id);
    if (stored === undefined) {
      throw new CoreError({
        code: ErrorCode.NOT_FOUND,
        message: `entity not found: ${id}`,
      });
    }
    // Preserve the immutable id regardless of the patch.
    stored.value = { ...stored.value, ...patch, id: stored.value.id };
    return clone(stored.value);
  }

  async delete(id: EntityId): Promise<void> {
    this.items.delete(id);
  }

  /** Snapshot the current state for transactional rollback. */
  snapshot(): RepositorySnapshot {
    const copy = new Map<EntityId, StoredEntity<T>>();
    for (const [id, stored] of this.items) {
      copy.set(id, { ...stored, value: clone(stored.value) });
    }
    return copy as unknown as RepositorySnapshot;
  }

  /** Restore a previously captured snapshot. */
  restore(snapshot: RepositorySnapshot): void {
    const typed = snapshot as unknown as Map<EntityId, StoredEntity<T>>;
    this.items.clear();
    for (const [id, stored] of typed) {
      this.items.set(id, { ...stored, value: clone(stored.value) });
    }
  }
}

/**
 * Opaque snapshot handle produced by {@link Snapshotable.snapshot}. The concrete
 * shape is internal to the repository that created it.
 */
export type RepositorySnapshot = { readonly __snapshot: unique symbol };

/** A repository that supports snapshot/restore for transactional rollback. */
export interface Snapshotable {
  snapshot(): RepositorySnapshot;
  restore(snapshot: RepositorySnapshot): void;
}

function cursorFor<T>(stored: StoredEntity<T>): string {
  return `${stored.createdAt}|${stored.seq}`;
}

function compareStored<T>(a: StoredEntity<T>, b: StoredEntity<T>): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return a.seq - b.seq;
}

function matchesFilter<T>(value: T, filter?: Filter<T>): boolean {
  if (filter === undefined) return true;
  for (const key of Object.keys(filter) as (keyof T)[]) {
    const expected = filter[key];
    if (expected === undefined) continue;
    if (value[key] !== expected) return false;
  }
  return true;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * In-memory {@link UnitOfWork}. Captures snapshots of the provided repositories
 * before running the callback and restores them if it throws (rollback).
 */
export class InMemoryUnitOfWork implements UnitOfWork {
  constructor(private readonly repositories: readonly Snapshotable[]) {}

  async runInTransaction<T>(
    fn: (ctx: TransactionContext) => Promise<T>,
  ): Promise<T> {
    const snapshots = this.repositories.map((repo) => repo.snapshot());
    const ctx: TransactionContext = { __transaction: true };
    try {
      return await fn(ctx);
    } catch (error) {
      this.repositories.forEach((repo, index) => {
        const snapshot = snapshots[index];
        if (snapshot !== undefined) repo.restore(snapshot);
      });
      throw error;
    }
  }
}

/**
 * @third-eye-cyborg/persistence
 *
 * Storage-agnostic repository, unit-of-work, and migration contracts with
 * in-memory implementations for tests and examples. No production schema or SQL.
 */

export {
  type Entity,
  type CursorPagination,
  type Page,
  type Filter,
  type Repository,
} from "./repository";

export {
  type TransactionContext,
  type UnitOfWork,
} from "./unit-of-work";

export {
  type MigrationRecord,
  type Migration,
  type MigrationPort,
} from "./migration";

export {
  type InMemoryRepositoryOptions,
  type RepositorySnapshot,
  type Snapshotable,
  InMemoryRepository,
  InMemoryUnitOfWork,
} from "./in-memory";

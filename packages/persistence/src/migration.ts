/**
 * Migration contracts — CONTRACT ONLY.
 *
 * This file intentionally contains NO SQL and NO schema. It only describes the
 * shape of a migration and a port to apply/roll back migrations so concrete,
 * private implementations can plug in.
 */

import type { IsoTimestamp } from "@third-eye-cyborg/ascended-core";

/** A record describing a single migration that has been applied. */
export interface MigrationRecord {
  /** Stable, ordered migration identifier, e.g. "0001_initial". */
  id: string;
  /** Human-readable description. */
  name: string;
  /** When the migration was applied. */
  appliedAt: IsoTimestamp;
  /** Optional checksum of the migration definition for drift detection. */
  checksum?: string;
}

/**
 * A migration definition. `up`/`down` receive an opaque context supplied by the
 * runner; this contract does not prescribe what the context contains.
 */
export interface Migration<Ctx = unknown> {
  /** Stable, ordered identifier. */
  id: string;
  /** Human-readable description. */
  name: string;
  /** Apply the migration. */
  up(ctx: Ctx): Promise<void>;
  /** Revert the migration. */
  down(ctx: Ctx): Promise<void>;
}

/**
 * Port for applying and inspecting migrations. Implementations are private and
 * store-specific; only the contract lives in the open-source package.
 */
export interface MigrationPort<Ctx = unknown> {
  /** List migrations already applied, in application order. */
  applied(): Promise<MigrationRecord[]>;
  /** Apply all pending migrations from the given set. */
  up(migrations: readonly Migration<Ctx>[]): Promise<MigrationRecord[]>;
  /** Revert the most recently applied migration, if any. */
  down(migrations: readonly Migration<Ctx>[]): Promise<MigrationRecord | null>;
}

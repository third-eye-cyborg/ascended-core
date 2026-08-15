/**
 * Unit-of-work and transaction contracts.
 *
 * Storage-agnostic: the transaction context is an opaque marker so adapters can
 * carry a native handle (db transaction, batch) without leaking it into
 * contracts.
 */

/**
 * Opaque marker for a transaction scope. Adapters extend this via structural
 * typing to carry their native transaction handle.
 */
export interface TransactionContext {
  /** Discriminator so the marker is not accidentally an empty object. */
  readonly __transaction: true;
}

/**
 * Unit-of-work contract. Runs a function within a transaction, committing on
 * success and rolling back if the function throws.
 */
export interface UnitOfWork {
  runInTransaction<T>(
    fn: (ctx: TransactionContext) => Promise<T>,
  ): Promise<T>;
}

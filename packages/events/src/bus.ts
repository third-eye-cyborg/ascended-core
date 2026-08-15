/**
 * Event-bus contracts: handler and subscription shapes plus the bus interface.
 */

import type { DomainEvent } from "./envelope";

/**
 * Handles a delivered event. Throwing (or rejecting) signals a delivery
 * failure and triggers the configured retry/dead-letter behaviour.
 */
export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => void | Promise<void>;

/** Options that tune subscription behaviour. */
export interface SubscriptionOptions {
  /**
   * When true (default), the bus dedupes redeliveries by `idempotencyKey`
   * for this subscription so a handler runs at most once per key.
   */
  idempotent?: boolean;
}

/** Unsubscribes a previously registered handler. Idempotent. */
export type Unsubscribe = () => void;

/** A typed, in-process domain-event bus. */
export interface EventBus {
  /** Publish a single event to all matching subscribers. */
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  /** Publish many events in order. */
  publishBatch(events: DomainEvent[]): Promise<void>;
  /**
   * Subscribe a handler to a specific event type.
   *
   * @returns A function that removes the subscription.
   */
  subscribe<TPayload>(
    type: string,
    handler: EventHandler<TPayload>,
    options?: SubscriptionOptions,
  ): Unsubscribe;
}

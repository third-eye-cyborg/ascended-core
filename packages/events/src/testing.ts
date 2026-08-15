/**
 * Test harness helpers for exercising the event bus deterministically.
 */

import type { EventBus } from "./bus";
import type { DeadLetterRecord, DeadLetterSink, DeliveryPolicy } from "./delivery";
import type { DomainEvent } from "./envelope";
import { InMemoryEventBus } from "./in-memory-bus";

/** An event harness bundling a bus with recorded publications and dead-letters. */
export interface EventHarness {
  /** The bus under test. */
  bus: EventBus;
  /** Every event passed to {@link EventBus.publish}, in order. */
  published: DomainEvent[];
  /** Every dead-lettered record, in order. */
  deadLetters: DeadLetterRecord[];
  /**
   * Resolve with the first published event of `type`. Because the bus is
   * synchronous, this resolves on the next microtask if already published.
   */
  waitFor(type: string): Promise<DomainEvent>;
}

/** Options for {@link createEventHarness}. */
export interface CreateEventHarnessOptions {
  /** Delivery policy for the underlying in-memory bus. */
  policy?: DeliveryPolicy;
}

/**
 * Create an {@link EventHarness} backed by an {@link InMemoryEventBus}.
 *
 * The returned bus records every published event and every dead-letter so
 * tests can assert on them without wiring their own spies.
 */
export function createEventHarness(options: CreateEventHarnessOptions = {}): EventHarness {
  const published: DomainEvent[] = [];
  const deadLetters: DeadLetterRecord[] = [];
  const waiters = new Map<string, Array<(event: DomainEvent) => void>>();

  const deadLetterSink: DeadLetterSink = {
    capture(record) {
      deadLetters.push(record);
    },
  };

  const inner = new InMemoryEventBus({ policy: options.policy, deadLetterSink });

  const record = (event: DomainEvent): void => {
    published.push(event);
    const pending = waiters.get(event.type);
    if (pending && pending.length > 0) {
      for (const resolve of pending) resolve(event);
      waiters.delete(event.type);
    }
  };

  const bus: EventBus = {
    subscribe: inner.subscribe.bind(inner),
    async publish(event) {
      record(event);
      await inner.publish(event);
    },
    async publishBatch(events) {
      for (const event of events) {
        record(event);
      }
      await inner.publishBatch(events);
    },
  };

  const waitFor = (type: string): Promise<DomainEvent> => {
    const existing = published.find((event) => event.type === type);
    if (existing) return Promise.resolve(existing);
    return new Promise<DomainEvent>((resolve) => {
      const list = waiters.get(type) ?? [];
      list.push(resolve);
      waiters.set(type, list);
    });
  };

  return { bus, published, deadLetters, waitFor };
}

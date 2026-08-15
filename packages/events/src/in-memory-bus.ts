/**
 * A deterministic, in-process {@link EventBus} implementation for application
 * wiring and tests.
 *
 * Determinism: handlers run synchronously in subscription order; retries run
 * synchronously and in order with no timers (the policy's `backoffMs` is not
 * awaited). This makes fan-out order, idempotency, and dead-lettering fully
 * reproducible.
 */

import { nowIso } from "@ascended/core";
import type { EventBus, EventHandler, SubscriptionOptions, Unsubscribe } from "./bus";
import {
  DEFAULT_DELIVERY_POLICY,
  type DeadLetterRecord,
  type DeadLetterSink,
  type DeliveryPolicy,
} from "./delivery";
import type { DomainEvent } from "./envelope";

interface Subscription {
  handler: EventHandler;
  idempotent: boolean;
  /** idempotencyKeys already delivered to this subscription. */
  seen: Set<string>;
}

/** Configuration for {@link InMemoryEventBus}. */
export interface InMemoryEventBusOptions {
  /** Retry policy applied per subscription delivery. */
  policy?: DeliveryPolicy;
  /** Sink that receives events after exhausting their attempts. */
  deadLetterSink?: DeadLetterSink;
}

/** In-memory event bus with idempotency dedupe, retry, and dead-lettering. */
export class InMemoryEventBus implements EventBus {
  private readonly subscriptions = new Map<string, Set<Subscription>>();
  private readonly policy: DeliveryPolicy;
  private readonly deadLetterSink?: DeadLetterSink;

  constructor(options: InMemoryEventBusOptions = {}) {
    this.policy = options.policy ?? DEFAULT_DELIVERY_POLICY;
    this.deadLetterSink = options.deadLetterSink;
  }

  subscribe<TPayload>(
    type: string,
    handler: EventHandler<TPayload>,
    options: SubscriptionOptions = {},
  ): Unsubscribe {
    const subscription: Subscription = {
      handler: handler as EventHandler,
      idempotent: options.idempotent ?? true,
      seen: new Set<string>(),
    };
    let set = this.subscriptions.get(type);
    if (!set) {
      set = new Set<Subscription>();
      this.subscriptions.set(type, set);
    }
    set.add(subscription);
    return () => {
      const current = this.subscriptions.get(type);
      current?.delete(subscription);
      if (current && current.size === 0) {
        this.subscriptions.delete(type);
      }
    };
  }

  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    const set = this.subscriptions.get(event.type);
    if (!set) return;
    // Snapshot to keep fan-out order stable even if handlers mutate subs.
    for (const subscription of [...set]) {
      await this.deliver(subscription, event as DomainEvent);
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  private async deliver(subscription: Subscription, event: DomainEvent): Promise<void> {
    if (subscription.idempotent && subscription.seen.has(event.idempotencyKey)) {
      return;
    }

    const maxAttempts = Math.max(1, this.policy.maxAttempts);
    let attempts = 0;
    let lastError: unknown;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        await subscription.handler(event);
        // Mark as seen only on successful delivery so a fully-failed event may
        // be legitimately retried on a later publish.
        if (subscription.idempotent) {
          subscription.seen.add(event.idempotencyKey);
        }
        return;
      } catch (error) {
        lastError = error;
        // No timer: backoffMs is advisory only for the deterministic bus.
      }
    }

    // Deliberately NOT marking the idempotency key as seen: a dead-lettered
    // event may be replayed after the downstream outage is resolved.
    await this.toDeadLetter(event, attempts, lastError);
  }

  private async toDeadLetter(
    event: DomainEvent,
    attempts: number,
    error: unknown,
  ): Promise<void> {
    if (!this.deadLetterSink) return;
    const record: DeadLetterRecord = {
      event,
      attempts,
      error: error instanceof Error ? error.message : String(error),
      deadLetteredAt: nowIso(),
    };
    await this.deadLetterSink.capture(record);
  }
}

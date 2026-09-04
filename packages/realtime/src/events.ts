/**
 * Event-bus interop contract used by the realtime local adapters.
 *
 * The concrete bus is supplied by `@third-eye-cyborg/events`. To keep this package
 * decoupled from the events package build order and to make the local
 * adapters trivially testable, we depend on a minimal *structural* port here.
 * Any object providing an async `publish` method — including the bus exported
 * by `@third-eye-cyborg/events` — satisfies this contract.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@third-eye-cyborg/core";

/**
 * A minimal, versioned domain-event envelope. This mirrors the shape emitted
 * by `@third-eye-cyborg/events` closely enough for adapters to publish without taking
 * a hard build dependency on that package's concrete classes.
 */
export interface DomainEvent<TPayload = unknown> {
  /** Unique event id, e.g. `evt_…`. */
  id: EntityId;
  /** Dotted event type, e.g. `realtime.room_joined`. */
  type: string;
  /** When the event occurred, in ISO-8601 UTC. */
  occurredAt: IsoTimestamp;
  /** Redaction-safe event payload. */
  payload: TPayload;
  /** Optional extension metadata (never secrets). */
  metadata?: Metadata;
}

/**
 * Structural port for publishing domain events. Satisfied by the event bus
 * from `@third-eye-cyborg/events`.
 */
export interface EventBus {
  /** Publish a domain event to all interested subscribers. */
  publish(event: DomainEvent): Promise<void>;
}

/**
 * Event-bus interop contract for media adapters.
 *
 * The concrete bus is provided by `@third-eye-cyborg/ascended-events`. To keep this package
 * decoupled from that package's build order and trivially testable, adapters
 * depend on the minimal *structural* port defined here. Any object exposing an
 * async `publish` — including the `@third-eye-cyborg/ascended-events` bus — satisfies it.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@third-eye-cyborg/ascended-core";

/** Minimal, versioned domain-event envelope compatible with `@third-eye-cyborg/ascended-events`. */
export interface DomainEvent<TPayload = unknown> {
  /** Unique event id, e.g. `evt_…`. */
  id: EntityId;
  /** Dotted event type, e.g. `media.asset_uploaded`. */
  type: string;
  /** When the event occurred, in ISO-8601 UTC. */
  occurredAt: IsoTimestamp;
  /** Redaction-safe event payload. */
  payload: TPayload;
  /** Optional extension metadata (never secrets). */
  metadata?: Metadata;
}

/** Structural port for publishing domain events. */
export interface EventBus {
  /** Publish a domain event to all interested subscribers. */
  publish(event: DomainEvent): Promise<void>;
}

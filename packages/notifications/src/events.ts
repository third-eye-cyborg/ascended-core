/**
 * Event-bus interop contract for notification services.
 *
 * The concrete bus is provided by `@ascended/events`. Services depend on the
 * minimal *structural* port defined here so they stay decoupled from that
 * package's build order and remain trivially testable. Any object exposing an
 * async `publish` — including the `@ascended/events` bus — satisfies it.
 */

import type { EntityId, IsoTimestamp, Metadata } from "@ascended/core";

/** Minimal, versioned domain-event envelope compatible with `@ascended/events`. */
export interface DomainEvent<TPayload = unknown> {
  /** Unique event id, e.g. `evt_…`. */
  id: EntityId;
  /** Dotted event type, e.g. `notification.requested`. */
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

/**
 * The domain-event envelope: a stable wrapper carried by every event on the
 * bus. Payloads are versioned per event type in {@link ./catalog}.
 */

import { z } from "zod";
import type { EntityId, IsoTimestamp } from "@ascended/core";

/**
 * A versioned, self-describing domain event.
 *
 * @typeParam TPayload - Shape of the event-specific payload.
 */
export interface DomainEvent<TPayload = unknown> {
  /** Unique id for this specific event instance. */
  id: EntityId;
  /** Dotted event type, e.g. "content.post_published". */
  type: string;
  /** Schema version of {@link DomainEvent.payload} for this type. */
  version: number;
  /** When the event occurred (ISO-8601 UTC). */
  occurredAt: IsoTimestamp;
  /** Name of the service that produced the event (e.g. "example-service"). */
  producer: string;
  /** Stable key used to dedupe redeliveries of the same logical event. */
  idempotencyKey: string;
  /** Correlates events belonging to the same logical workflow. */
  correlationId?: string;
  /** Id of the event that directly caused this one. */
  causationId?: string;
  /** Event-specific payload. */
  payload: TPayload;
}

/**
 * Zod schema for the envelope fields (excluding the type-specific payload,
 * which is validated per event type by the catalog).
 */
export const envelopeMetaSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  version: z.number().int().nonnegative(),
  occurredAt: z.string().min(1),
  producer: z.string().min(1),
  idempotencyKey: z.string().min(1),
  correlationId: z.string().min(1).optional(),
  causationId: z.string().min(1).optional(),
});

/**
 * Build a zod schema for a full {@link DomainEvent} given a payload schema.
 *
 * @param payloadSchema - Schema validating the `payload` field.
 */
export function domainEventSchema<TSchema extends z.ZodTypeAny>(payloadSchema: TSchema) {
  return envelopeMetaSchema.extend({ payload: payloadSchema });
}

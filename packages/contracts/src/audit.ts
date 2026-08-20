/**
 * Audit bounded context: a redaction-safe audit-event shape.
 *
 * Audit events are designed to be safe to persist and ship to telemetry: the
 * `metadata` bag must never contain secrets or raw PII.
 */

import { isEntityId, type EntityId, type IsoTimestamp, type Metadata } from "@third-eye-cyborg/core";
import { isRecord } from "./internal/guards";

/** A redaction-safe record of an action taken against a target. */
export interface AuditEvent {
  id: EntityId;
  /** Account (or system principal) that performed the action. */
  actorId: EntityId;
  /** Machine-readable action key (e.g. "post.published"). */
  action: string;
  /** Type of the affected target (e.g. "post"). */
  targetType: string;
  /** Identifier of the affected target. */
  targetId: EntityId;
  /** When the action occurred. */
  occurredAt: IsoTimestamp;
  /** Redaction-safe structured context; never secrets or raw PII. */
  metadata?: Metadata;
}

/** Type guard for {@link AuditEvent}. */
export function isAuditEvent(value: unknown): value is AuditEvent {
  if (!isRecord(value)) return false;
  return (
    isEntityId(value["id"]) &&
    isEntityId(value["actorId"]) &&
    typeof value["action"] === "string" &&
    typeof value["targetType"] === "string" &&
    isEntityId(value["targetId"]) &&
    typeof value["occurredAt"] === "string"
  );
}

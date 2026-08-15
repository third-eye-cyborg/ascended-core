/**
 * Audit log port plus an in-memory adapter.
 */

import {
  createId,
  nowIso,
  HealthState,
  type EntityId,
  type IsoTimestamp,
  type HealthCheckable,
  type HealthReport,
  type Metadata,
} from "@ascended/core";

/** An auditable event. Payloads must be redaction-safe (no secrets/PII). */
export interface AuditEvent {
  /** Abstract action name, e.g. "session.issued". */
  action: string;
  /** Opaque actor account, when known. */
  actorId?: EntityId;
  /** Abstract target descriptor, e.g. "document:doc_123". */
  target?: string;
  /** Redaction-safe structured context. */
  context?: Metadata;
}

/** A persisted audit record with an assigned id and timestamp. */
export interface AuditRecord extends AuditEvent {
  id: EntityId;
  recordedAt: IsoTimestamp;
}

/** Audit log port. */
export interface AuditLogPort {
  record(event: AuditEvent): Promise<AuditRecord>;
}

/** In-memory {@link AuditLogPort} for tests and examples. */
export class InMemoryAuditLog implements AuditLogPort, HealthCheckable {
  private readonly records: AuditRecord[] = [];

  async record(event: AuditEvent): Promise<AuditRecord> {
    const record: AuditRecord = {
      ...event,
      id: createId("audit"),
      recordedAt: nowIso(),
    };
    this.records.push(record);
    return record;
  }

  /** All records so far, in insertion order. */
  get entries(): readonly AuditRecord[] {
    return this.records;
  }

  async checkHealth(): Promise<HealthReport> {
    return {
      state: HealthState.HEALTHY,
      checkedAt: nowIso(),
      details: { records: this.records.length },
    };
  }
}

/**
 * Notification primitives. Templates are referenced by opaque string keys and
 * `data` must be redaction-safe (no secrets, no raw PII).
 */

import type { EntityId, IsoTimestamp, Metadata } from "@third-eye-cyborg/core";

/** Delivery channel for a notification. */
export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
  PUSH = "push",
}

/** A request to notify a recipient via one or more channels. */
export interface NotificationRequest {
  /** Account to notify. */
  recipientAccountId: EntityId;
  /** Opaque template key, e.g. `welcome`. */
  template: string;
  /** Redaction-safe template data. Must never contain secrets or raw PII. */
  data: Record<string, unknown>;
  /**
   * Channels to attempt. When omitted, all channels enabled by the recipient's
   * preferences are attempted.
   */
  channels?: NotificationChannel[];
  /** Optional extension metadata. */
  metadata?: Metadata;
}

/** Outcome state of a per-channel delivery attempt. */
export enum DeliveryState {
  QUEUED = "queued",
  SENT = "sent",
  FAILED = "failed",
  SKIPPED = "skipped",
}

/** The result of attempting delivery on a single channel. */
export interface DeliveryAttempt {
  /** Channel the attempt targeted. */
  channel: NotificationChannel;
  /** Outcome state. */
  state: DeliveryState;
  /** When the attempt was made. */
  attemptedAt: IsoTimestamp;
  /** Human-readable reason when skipped or failed. */
  failureReason?: string;
}

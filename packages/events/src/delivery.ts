/**
 * Retry and dead-letter contracts for event delivery.
 */

import type { IsoTimestamp } from "@ascended/core";
import type { DomainEvent } from "./envelope";

/**
 * Delivery policy controlling how many times a handler is retried and the
 * (advisory) backoff between attempts. The in-memory bus executes retries
 * synchronously and does not sleep for `backoffMs`.
 */
export interface DeliveryPolicy {
  /** Total attempts, including the first, before dead-lettering. Minimum 1. */
  maxAttempts: number;
  /** Advisory backoff between attempts, in milliseconds. */
  backoffMs: number;
}

/** Default delivery policy: two attempts, short advisory backoff. */
export const DEFAULT_DELIVERY_POLICY: DeliveryPolicy = {
  maxAttempts: 2,
  backoffMs: 0,
};

/** A record captured when an event exhausts its delivery attempts. */
export interface DeadLetterRecord {
  /** The event that failed to deliver. */
  event: DomainEvent;
  /** Number of attempts made before dead-lettering. */
  attempts: number;
  /** Redaction-safe error message from the final failed attempt. */
  error: string;
  /** When the event was dead-lettered. */
  deadLetteredAt: IsoTimestamp;
}

/** Sink that receives events which could not be delivered. */
export interface DeadLetterSink {
  /** Capture a dead-lettered event. */
  capture(record: DeadLetterRecord): void | Promise<void>;
}

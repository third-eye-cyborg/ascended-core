/**
 * Email delivery port plus a recording adapter for tests and examples.
 *
 * Vendor-neutral: no email service provider is referenced.
 */

import {
  createId,
  nowIso,
  HealthState,
  type EntityId,
  type IsoTimestamp,
  type HealthCheckable,
  type HealthReport,
} from "@ascended/core";

/** An outbound email message. Bodies must never be logged verbatim. */
export interface EmailMessage {
  /** Recipient address, e.g. "sam.placeholder@example.com". */
  to: string;
  /** Subject line. */
  subject: string;
  /** Plain-text body. */
  text: string;
  /** Optional HTML body. */
  html?: string;
}

/** Confirmation that a message was accepted for delivery. */
export interface DeliveryReceipt {
  /** Opaque delivery identifier. */
  messageId: EntityId;
  /** Recipient the receipt is for. */
  to: string;
  /** When delivery was accepted. */
  acceptedAt: IsoTimestamp;
}

/** Email port. Implementations accept a message for delivery. */
export interface EmailPort {
  send(message: EmailMessage): Promise<DeliveryReceipt>;
}

/**
 * {@link EmailPort} adapter that records every message in memory instead of
 * sending it. For tests and examples only.
 */
export class RecordingEmailAdapter implements EmailPort, HealthCheckable {
  private readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<DeliveryReceipt> {
    this.sent.push({ ...message });
    return {
      messageId: createId("msg"),
      to: message.to,
      acceptedAt: nowIso(),
    };
  }

  /** All messages recorded so far, in send order. */
  get messages(): readonly EmailMessage[] {
    return this.sent;
  }

  /** Clear recorded messages. */
  clear(): void {
    this.sent.length = 0;
  }

  async checkHealth(): Promise<HealthReport> {
    return {
      state: HealthState.HEALTHY,
      checkedAt: nowIso(),
      details: { recorded: this.sent.length },
    };
  }
}

/**
 * Outbound webhook delivery contracts. The signature helper implements a
 * generic HMAC-SHA256 scheme (algorithm only) — no vendor-specific header
 * layout or timestamp-tolerance format is baked in.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { IsoTimestamp } from "@ascended/core";
import { nowIso } from "@ascended/core";
import type { DomainEvent } from "./events";

/** A configured webhook endpoint. */
export interface WebhookEndpoint {
  /** Absolute delivery URL, e.g. `https://example.com/hooks`. */
  url: string;
  /** Shared secret used to sign payloads. */
  secret: string;
}

/** The outcome of a single delivery attempt. */
export interface DeliveryAttempt {
  /** Endpoint URL the attempt targeted. */
  url: string;
  /** Whether the attempt succeeded. */
  ok: boolean;
  /** HTTP-style status code, when the transport produced one. */
  statusCode?: number;
  /** Hex-encoded HMAC-SHA256 signature of the delivered body. */
  signature: string;
  /** When the attempt was made. */
  attemptedAt: IsoTimestamp;
  /** Human-readable failure reason when `ok` is false. */
  failureReason?: string;
}

/** Port for delivering a domain event to a webhook endpoint. */
export interface WebhookDeliveryPort {
  /** Deliver an event to an endpoint, returning the attempt outcome. */
  deliver(endpoint: WebhookEndpoint, event: DomainEvent): Promise<DeliveryAttempt>;
}

/**
 * Compute a generic HMAC-SHA256 signature over a payload string.
 * @returns the lowercase hex digest.
 */
export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Constant-time verification of a hex HMAC-SHA256 signature.
 */
export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Serialize an event to its canonical delivery body. */
export function serializeEvent(event: DomainEvent): string {
  return JSON.stringify(event);
}

/**
 * Test double that records what it would have delivered and always succeeds.
 * It performs the real signing so signature round-trips can be asserted, but
 * never performs network IO.
 */
export class RecordingWebhookDelivery implements WebhookDeliveryPort {
  /** All attempts recorded so far, in order. */
  readonly attempts: Array<{ endpoint: WebhookEndpoint; event: DomainEvent; body: string }> = [];

  async deliver(endpoint: WebhookEndpoint, event: DomainEvent): Promise<DeliveryAttempt> {
    const body = serializeEvent(event);
    const signature = signPayload(endpoint.secret, body);
    this.attempts.push({ endpoint, event, body });
    return {
      url: endpoint.url,
      ok: true,
      statusCode: 200,
      signature,
      attemptedAt: nowIso(),
    };
  }
}

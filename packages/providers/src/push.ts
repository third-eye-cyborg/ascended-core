/**
 * Push notification port plus a recording adapter for tests and examples.
 *
 * Vendor-neutral: no push service provider is referenced.
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

/**
 * Delivery target for a push notification. Either a platform device token or a
 * web-push style subscription descriptor.
 */
export type PushTarget =
  | { kind: "deviceToken"; token: string }
  | { kind: "subscription"; endpoint: string; keys?: Record<string, string> };

/** The payload delivered to a device. */
export interface PushPayload {
  title: string;
  body: string;
  /** Redaction-safe data bag delivered alongside the message. */
  data?: Metadata;
}

/** Confirmation that a push was accepted for delivery. */
export interface PushReceipt {
  /** Opaque delivery identifier. */
  notificationId: EntityId;
  /** When delivery was accepted. */
  acceptedAt: IsoTimestamp;
}

/** Push notification port. */
export interface PushNotificationPort {
  send(target: PushTarget, payload: PushPayload): Promise<PushReceipt>;
}

/** A recorded push send (target + payload). */
export interface RecordedPush {
  target: PushTarget;
  payload: PushPayload;
}

/**
 * {@link PushNotificationPort} adapter that records every send in memory. For
 * tests and examples only.
 */
export class RecordingPushAdapter
  implements PushNotificationPort, HealthCheckable
{
  private readonly sent: RecordedPush[] = [];

  async send(target: PushTarget, payload: PushPayload): Promise<PushReceipt> {
    this.sent.push({ target, payload: { ...payload } });
    return { notificationId: createId("push"), acceptedAt: nowIso() };
  }

  /** All pushes recorded so far, in send order. */
  get notifications(): readonly RecordedPush[] {
    return this.sent;
  }

  /** Clear recorded pushes. */
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

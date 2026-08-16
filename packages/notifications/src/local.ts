/**
 * Local in-memory notification channel adapters for development and tests.
 */

import { nowIso } from "@third-eye-cyborg/ascended-core";
import type { EntityId, IsoTimestamp } from "@third-eye-cyborg/ascended-core";
import type {
  EmailSenderPort,
  InAppNotificationPort,
  PushSenderPort,
} from "./service";
import type { NotificationRequest } from "./types";

/** A single stored in-app inbox item. */
export interface InboxItem {
  /** Template key the item was rendered from. */
  template: string;
  /** Redaction-safe template data. */
  data: Record<string, unknown>;
  /** When the item was delivered. */
  deliveredAt: IsoTimestamp;
}

/** In-memory in-app inbox keyed by recipient account id. */
export class InMemoryInAppInbox implements InAppNotificationPort {
  private readonly inboxes = new Map<EntityId, InboxItem[]>();

  async deliver(request: NotificationRequest): Promise<void> {
    const items = this.inboxes.get(request.recipientAccountId) ?? [];
    items.push({ template: request.template, data: request.data, deliveredAt: nowIso() });
    this.inboxes.set(request.recipientAccountId, items);
  }

  /** Read the inbox for an account. */
  list(accountId: EntityId): InboxItem[] {
    return [...(this.inboxes.get(accountId) ?? [])];
  }
}

/** Email sender that records requests instead of sending. */
export class RecordingEmailSender implements EmailSenderPort {
  /** All delivery requests recorded so far, in order. */
  readonly sent: NotificationRequest[] = [];

  async deliver(request: NotificationRequest): Promise<void> {
    this.sent.push(request);
  }
}

/** Push sender that records requests instead of sending. */
export class RecordingPushSender implements PushSenderPort {
  /** All delivery requests recorded so far, in order. */
  readonly sent: NotificationRequest[] = [];

  async deliver(request: NotificationRequest): Promise<void> {
    this.sent.push(request);
  }
}

/**
 * Notification service. Honors recipient preferences and muted templates,
 * dispatches to injected channel senders, and emits `notification.requested`.
 */

import { CoreError, ErrorCode, createId, nowIso } from "@third-eye-cyborg/ascended-core";
import type { EventBus } from "./events";
import type { NotificationPreferencesPort } from "./preferences";
import {
  DeliveryState,
  NotificationChannel,
} from "./types";
import type { DeliveryAttempt, NotificationRequest } from "./types";

/** Sender for in-app inbox notifications. */
export interface InAppNotificationPort {
  /** Deliver a notification to a recipient's in-app inbox. */
  deliver(request: NotificationRequest): Promise<void>;
}

/** Sender for email notifications. */
export interface EmailSenderPort {
  /** Deliver a notification via email. */
  deliver(request: NotificationRequest): Promise<void>;
}

/** Sender for push notifications. */
export interface PushSenderPort {
  /** Deliver a notification via push. */
  deliver(request: NotificationRequest): Promise<void>;
}

/** Channel senders injected into the {@link NotificationService}. */
export interface ChannelSenders {
  inApp: InAppNotificationPort;
  email: EmailSenderPort;
  push: PushSenderPort;
}

const ALL_CHANNELS: NotificationChannel[] = [
  NotificationChannel.IN_APP,
  NotificationChannel.EMAIL,
  NotificationChannel.PUSH,
];

/**
 * Coordinates multi-channel notification delivery under recipient preferences.
 */
export class NotificationService {
  constructor(
    private readonly bus: EventBus,
    private readonly preferences: NotificationPreferencesPort,
    private readonly senders: ChannelSenders,
  ) {}

  /**
   * Dispatch a notification, returning one {@link DeliveryAttempt} per channel
   * considered. Sender failures produce a `failed` attempt without throwing.
   */
  async notify(request: NotificationRequest): Promise<DeliveryAttempt[]> {
    await this.bus.publish({
      id: createId("evt"),
      type: "notification.requested",
      occurredAt: nowIso(),
      payload: {
        recipientAccountId: request.recipientAccountId,
        template: request.template,
      },
    });

    const prefs = await this.preferences.getPreferences(request.recipientAccountId);
    const requested = request.channels ?? ALL_CHANNELS;
    const attempts: DeliveryAttempt[] = [];

    for (const channel of requested) {
      if (prefs.mutedTemplates.includes(request.template)) {
        attempts.push(this.skip(channel, "template muted"));
        continue;
      }
      if (prefs.channels[channel] === false) {
        attempts.push(this.skip(channel, "channel disabled"));
        continue;
      }
      attempts.push(await this.dispatch(channel, request));
    }

    return attempts;
  }

  private skip(channel: NotificationChannel, reason: string): DeliveryAttempt {
    return {
      channel,
      state: DeliveryState.SKIPPED,
      attemptedAt: nowIso(),
      failureReason: reason,
    };
  }

  private async dispatch(
    channel: NotificationChannel,
    request: NotificationRequest,
  ): Promise<DeliveryAttempt> {
    try {
      await this.senderFor(channel).deliver(request);
      return { channel, state: DeliveryState.SENT, attemptedAt: nowIso() };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "sender failed";
      return {
        channel,
        state: DeliveryState.FAILED,
        attemptedAt: nowIso(),
        failureReason: message,
      };
    }
  }

  private senderFor(channel: NotificationChannel): { deliver(r: NotificationRequest): Promise<void> } {
    switch (channel) {
      case NotificationChannel.IN_APP:
        return this.senders.inApp;
      case NotificationChannel.EMAIL:
        return this.senders.email;
      case NotificationChannel.PUSH:
        return this.senders.push;
      default:
        throw new CoreError({
          code: ErrorCode.UNSUPPORTED,
          message: `Unsupported channel: ${String(channel)}`,
        });
    }
  }
}

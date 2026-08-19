/**
 * `@third-eye-cyborg/notifications` — preferences, delivery attempts, and multi-channel
 * (in-app/email/push) workflow contracts with local adapters.
 */

export type { DomainEvent, EventBus } from "./events";

export type { DeliveryAttempt, NotificationRequest } from "./types";
export { DeliveryState, NotificationChannel } from "./types";

export type {
  NotificationPreferences,
  NotificationPreferencesPort,
} from "./preferences";
export { InMemoryPreferences, allowAllPreferences } from "./preferences";

export type {
  ChannelSenders,
  EmailSenderPort,
  InAppNotificationPort,
  PushSenderPort,
} from "./service";
export { NotificationService } from "./service";

export type { InboxItem } from "./local";
export {
  InMemoryInAppInbox,
  RecordingEmailSender,
  RecordingPushSender,
} from "./local";

export type {
  Clock,
  ReminderSchedulerPort,
  ScheduledReminder,
} from "./workflows";
export { InMemoryReminderQueue, systemClock } from "./workflows";

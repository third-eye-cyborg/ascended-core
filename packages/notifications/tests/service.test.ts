import { describe, it, expect } from "vitest";
import { createId } from "@ascended/core";
import { NotificationService } from "../src/service";
import type { ChannelSenders } from "../src/service";
import {
  InMemoryInAppInbox,
  RecordingEmailSender,
  RecordingPushSender,
} from "../src/local";
import { InMemoryPreferences, allowAllPreferences } from "../src/preferences";
import { DeliveryState, NotificationChannel } from "../src/types";
import { RecordingEventBus, ThrowingEmailSender } from "./support";

function senders(overrides?: Partial<ChannelSenders>): ChannelSenders {
  return {
    inApp: new InMemoryInAppInbox(),
    email: new RecordingEmailSender(),
    push: new RecordingPushSender(),
    ...overrides,
  };
}

describe("NotificationService", () => {
  it("emits notification.requested and sends across channels", async () => {
    const bus = new RecordingEventBus();
    const service = new NotificationService(bus, new InMemoryPreferences(), senders());
    const attempts = await service.notify({
      recipientAccountId: createId("acct"),
      template: "welcome",
      data: { name: "Ada Example" },
    });

    expect(bus.types()).toContain("notification.requested");
    expect(attempts).toHaveLength(3);
    expect(attempts.every((a) => a.state === DeliveryState.SENT)).toBe(true);
  });

  it("skips a muted template with state skipped", async () => {
    const prefs = new InMemoryPreferences();
    const account = createId("acct");
    await prefs.setPreferences(account, {
      ...allowAllPreferences(),
      mutedTemplates: ["digest"],
    });
    const service = new NotificationService(new RecordingEventBus(), prefs, senders());

    const attempts = await service.notify({
      recipientAccountId: account,
      template: "digest",
      data: {},
      channels: [NotificationChannel.EMAIL],
    });

    expect(attempts[0]?.state).toBe(DeliveryState.SKIPPED);
  });

  it("skips a disabled channel", async () => {
    const prefs = new InMemoryPreferences();
    const account = createId("acct");
    await prefs.setPreferences(account, {
      channels: {
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.EMAIL]: false,
        [NotificationChannel.PUSH]: true,
      },
      mutedTemplates: [],
    });
    const service = new NotificationService(new RecordingEventBus(), prefs, senders());
    const attempts = await service.notify({
      recipientAccountId: account,
      template: "welcome",
      data: {},
      channels: [NotificationChannel.EMAIL],
    });
    expect(attempts[0]?.state).toBe(DeliveryState.SKIPPED);
    expect(attempts[0]?.failureReason).toBe("channel disabled");
  });

  it("produces a failed attempt when a sender throws, without throwing", async () => {
    const service = new NotificationService(
      new RecordingEventBus(),
      new InMemoryPreferences(),
      senders({ email: new ThrowingEmailSender() }),
    );
    const attempts = await service.notify({
      recipientAccountId: createId("acct"),
      template: "welcome",
      data: {},
      channels: [NotificationChannel.EMAIL],
    });
    expect(attempts[0]?.state).toBe(DeliveryState.FAILED);
    expect(attempts[0]?.failureReason).toContain("unavailable");
  });
});

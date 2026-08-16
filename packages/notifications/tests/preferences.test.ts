import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/ascended-core";
import { InMemoryPreferences } from "../src/preferences";
import { NotificationChannel } from "../src/types";

describe("InMemoryPreferences", () => {
  it("defaults to allow-all", async () => {
    const prefs = new InMemoryPreferences();
    const result = await prefs.getPreferences(createId("acct"));
    expect(result.channels[NotificationChannel.EMAIL]).toBe(true);
    expect(result.mutedTemplates).toEqual([]);
  });

  it("persists and returns set preferences", async () => {
    const prefs = new InMemoryPreferences();
    const account = createId("acct");
    await prefs.setPreferences(account, {
      channels: {
        [NotificationChannel.IN_APP]: true,
        [NotificationChannel.EMAIL]: false,
        [NotificationChannel.PUSH]: true,
      },
      mutedTemplates: ["digest"],
    });
    const result = await prefs.getPreferences(account);
    expect(result.channels[NotificationChannel.EMAIL]).toBe(false);
    expect(result.mutedTemplates).toContain("digest");
  });
});

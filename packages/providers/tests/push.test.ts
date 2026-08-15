import { describe, it, expect } from "vitest";
import { RecordingPushAdapter } from "../src/index";

describe("RecordingPushAdapter", () => {
  it("records sends to a device token target", async () => {
    const adapter = new RecordingPushAdapter();
    const receipt = await adapter.send(
      { kind: "deviceToken", token: "device-abc" },
      { title: "Hi", body: "You have an update" },
    );

    expect(receipt.notificationId).toBeDefined();
    expect(adapter.notifications).toHaveLength(1);
    expect(adapter.notifications[0]?.target).toEqual({
      kind: "deviceToken",
      token: "device-abc",
    });
  });
});

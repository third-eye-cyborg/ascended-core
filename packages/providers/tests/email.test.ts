import { describe, it, expect } from "vitest";
import { RecordingEmailAdapter } from "../src/index";

describe("RecordingEmailAdapter", () => {
  it("records sent messages and returns a receipt", async () => {
    const adapter = new RecordingEmailAdapter();
    const receipt = await adapter.send({
      to: "sam.placeholder@example.com",
      subject: "Welcome",
      text: "Hello from Ada Example",
    });

    expect(receipt.to).toBe("sam.placeholder@example.com");
    expect(adapter.messages).toHaveLength(1);
    expect(adapter.messages[0]?.subject).toBe("Welcome");

    adapter.clear();
    expect(adapter.messages).toHaveLength(0);
  });
});

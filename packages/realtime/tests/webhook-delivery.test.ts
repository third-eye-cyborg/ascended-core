import { describe, it, expect } from "vitest";
import { createId, nowIso } from "@ascended/core";
import type { DomainEvent } from "../src/events";
import {
  RecordingWebhookDelivery,
  serializeEvent,
  signPayload,
  verifySignature,
} from "../src/webhook-delivery";

function sampleEvent(): DomainEvent {
  return {
    id: createId("evt"),
    type: "realtime.room_joined",
    occurredAt: nowIso(),
    payload: { roomId: createId("room"), accountId: createId("acct") },
  };
}

describe("webhook signatures", () => {
  it("round-trips a signature via verifySignature", () => {
    const secret = "placeholder-secret";
    const body = serializeEvent(sampleEvent());
    const sig = signPayload(secret, body);
    expect(verifySignature(secret, body, sig)).toBe(true);
    expect(verifySignature("other-secret", body, sig)).toBe(false);
  });

  it("RecordingWebhookDelivery signs the delivered body", async () => {
    const delivery = new RecordingWebhookDelivery();
    const endpoint = { url: "https://example.com/hooks", secret: "placeholder-secret" };
    const event = sampleEvent();
    const attempt = await delivery.deliver(endpoint, event);

    expect(attempt.ok).toBe(true);
    expect(delivery.attempts).toHaveLength(1);
    const recorded = delivery.attempts[0];
    expect(recorded).toBeDefined();
    expect(verifySignature(endpoint.secret, recorded!.body, attempt.signature)).toBe(true);
  });
});

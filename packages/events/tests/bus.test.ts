import { describe, it, expect } from "vitest";
import { createId, nowIso, type EntityId } from "@third-eye-cyborg/core";
import {
  createEventHarness,
  EVENT_TYPES,
  InMemoryEventBus,
  type DeadLetterRecord,
  type DomainEvent,
} from "../src/index";

const now = nowIso();

function makeEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: createId("evt") as EntityId,
    type: EVENT_TYPES.CONTENT_POST_PUBLISHED,
    version: 1,
    occurredAt: now,
    producer: "example-service",
    idempotencyKey: "key-1",
    payload: { postId: createId("post"), authorId: createId("acct"), publishedAt: now },
    ...overrides,
  };
}

describe("InMemoryEventBus pub/sub", () => {
  it("fans out to subscribers in subscription order", async () => {
    const bus = new InMemoryEventBus();
    const order: string[] = [];
    bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      order.push("first");
    });
    bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      order.push("second");
    });
    await bus.publish(makeEvent());
    expect(order).toEqual(["first", "second"]);
  });

  it("only delivers to matching event types", async () => {
    const bus = new InMemoryEventBus();
    let hits = 0;
    bus.subscribe(EVENT_TYPES.COMMUNITY_MEMBER_JOINED, () => {
      hits += 1;
    });
    await bus.publish(makeEvent());
    expect(hits).toBe(0);
  });

  it("unsubscribe stops further delivery", async () => {
    const bus = new InMemoryEventBus();
    let hits = 0;
    const off = bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      hits += 1;
    });
    await bus.publish(makeEvent({ idempotencyKey: "a" }));
    off();
    await bus.publish(makeEvent({ idempotencyKey: "b" }));
    expect(hits).toBe(1);
  });

  it("publishBatch delivers events in order", async () => {
    const bus = new InMemoryEventBus();
    const seen: string[] = [];
    bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, (event) => {
      seen.push(event.idempotencyKey);
    });
    await bus.publishBatch([
      makeEvent({ idempotencyKey: "1" }),
      makeEvent({ idempotencyKey: "2" }),
      makeEvent({ idempotencyKey: "3" }),
    ]);
    expect(seen).toEqual(["1", "2", "3"]);
  });
});

describe("idempotency", () => {
  it("delivers a repeated idempotencyKey exactly once by default", async () => {
    const bus = new InMemoryEventBus();
    let hits = 0;
    bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      hits += 1;
    });
    await bus.publish(makeEvent({ idempotencyKey: "same" }));
    await bus.publish(makeEvent({ idempotencyKey: "same" }));
    expect(hits).toBe(1);
  });

  it("delivers each time when idempotency is disabled", async () => {
    const bus = new InMemoryEventBus();
    let hits = 0;
    bus.subscribe(
      EVENT_TYPES.CONTENT_POST_PUBLISHED,
      () => {
        hits += 1;
      },
      { idempotent: false },
    );
    await bus.publish(makeEvent({ idempotencyKey: "same" }));
    await bus.publish(makeEvent({ idempotencyKey: "same" }));
    expect(hits).toBe(2);
  });
});

describe("retry and dead-letter", () => {
  it("retries up to maxAttempts then dead-letters", async () => {
    const captured: DeadLetterRecord[] = [];
    let attempts = 0;
    const bus = new InMemoryEventBus({
      policy: { maxAttempts: 3, backoffMs: 0 },
      deadLetterSink: { capture: (r) => void captured.push(r) },
    });
    bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      attempts += 1;
      throw new Error("boom");
    });
    await bus.publish(makeEvent());
    expect(attempts).toBe(3);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.attempts).toBe(3);
    expect(captured[0]?.error).toBe("boom");
  });

  it("allows replay of a dead-lettered event after the outage is resolved", async () => {
    const captured: DeadLetterRecord[] = [];
    let attempts = 0;
    let healthy = false;
    const bus = new InMemoryEventBus({
      policy: { maxAttempts: 2, backoffMs: 0 },
      deadLetterSink: { capture: (r) => void captured.push(r) },
    });
    bus.subscribe(
      EVENT_TYPES.CONTENT_POST_PUBLISHED,
      () => {
        attempts += 1;
        if (!healthy) throw new Error("downstream down");
      },
      { idempotent: true },
    );
    const event = makeEvent({ idempotencyKey: "replay-me" });
    await bus.publish(event);
    expect(captured).toHaveLength(1);

    // Replaying the same idempotency key after recovery must be processed,
    // not silently discarded as a duplicate.
    healthy = true;
    await bus.publish(event);
    expect(attempts).toBe(3);
  });

  it("succeeds on a later attempt without dead-lettering", async () => {
    const captured: DeadLetterRecord[] = [];
    let attempts = 0;
    const bus = new InMemoryEventBus({
      policy: { maxAttempts: 3, backoffMs: 0 },
      deadLetterSink: { capture: (r) => void captured.push(r) },
    });
    bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      attempts += 1;
      if (attempts < 2) throw new Error("transient");
    });
    await bus.publish(makeEvent());
    expect(attempts).toBe(2);
    expect(captured).toHaveLength(0);
  });
});

describe("createEventHarness", () => {
  it("records published events and resolves waitFor", async () => {
    const harness = createEventHarness();
    const received: string[] = [];
    harness.bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, (event) => {
      received.push(event.id);
    });
    const event = makeEvent();
    const waiting = harness.waitFor(EVENT_TYPES.CONTENT_POST_PUBLISHED);
    await harness.bus.publish(event);
    const resolved = await waiting;
    expect(resolved.id).toBe(event.id);
    expect(harness.published).toHaveLength(1);
    expect(received).toEqual([event.id]);
  });

  it("captures dead letters through the harness", async () => {
    const harness = createEventHarness({ policy: { maxAttempts: 1, backoffMs: 0 } });
    harness.bus.subscribe(EVENT_TYPES.CONTENT_POST_PUBLISHED, () => {
      throw new Error("nope");
    });
    await harness.bus.publish(makeEvent());
    expect(harness.deadLetters).toHaveLength(1);
    expect(harness.deadLetters[0]?.attempts).toBe(1);
  });
});

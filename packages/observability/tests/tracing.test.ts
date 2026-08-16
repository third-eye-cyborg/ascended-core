import { describe, it, expect } from "vitest";
import { type IsoTimestamp } from "@third-eye-cyborg/ascended-core";
import { InMemoryTracer } from "../src/index";

describe("InMemoryTracer", () => {
  it("records a completed span with duration", () => {
    let tick = 0;
    const times = [
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.050Z",
    ] as IsoTimestamp[];
    const tracer = new InMemoryTracer({ now: () => times[tick++]! });

    const span = tracer.startSpan("work", { step: "one" });
    span.end();

    const finished = tracer.spans[0];
    expect(finished?.name).toBe("work");
    expect(finished?.status).toBe("ok");
    expect(finished?.durationMs).toBe(50);
    expect(finished?.attributes).toEqual({ step: "one" });
  });

  it("records errors and marks the span errored", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("work");
    span.recordError(new Error("kaboom"));

    const finished = tracer.spans[0];
    expect(finished?.status).toBe("error");
    expect(finished?.errorMessage).toBe("kaboom");
  });

  it("ignores a second end call", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("work");
    span.end();
    span.end("error");
    expect(tracer.spans).toHaveLength(1);
    expect(tracer.spans[0]?.status).toBe("ok");
  });
});

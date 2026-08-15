import { describe, it, expect } from "vitest";
import { InMemoryMetrics, metricKey } from "../src/index";

describe("InMemoryMetrics", () => {
  it("accumulates counters, timings, and gauges into a snapshot", () => {
    const metrics = new InMemoryMetrics();
    metrics.increment("requests", { route: "home" });
    metrics.increment("requests", { route: "home" });
    metrics.timing("latency", 12, { route: "home" });
    metrics.timing("latency", 8, { route: "home" });
    metrics.gauge("connections", 5);

    const snap = metrics.snapshot();
    const key = metricKey("requests", { route: "home" });
    expect(snap.counters[key]).toBe(2);
    expect(snap.timings[metricKey("latency", { route: "home" })]).toEqual([
      12, 8,
    ]);
    expect(snap.gauges["connections"]).toBe(5);
  });

  it("produces stable keys regardless of tag order", () => {
    expect(metricKey("m", { a: "1", b: "2" })).toBe(
      metricKey("m", { b: "2", a: "1" }),
    );
  });
});

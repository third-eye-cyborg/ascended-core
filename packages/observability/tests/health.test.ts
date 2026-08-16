import { describe, it, expect } from "vitest";
import {
  HealthState,
  nowIso,
  type HealthCheckable,
  type HealthReport,
} from "@third-eye-cyborg/ascended-core";
import {
  HealthAggregator,
  ProviderHealthTracker,
  ProviderState,
} from "../src/index";

function checkable(state: HealthState): HealthCheckable {
  return {
    async checkHealth(): Promise<HealthReport> {
      return { state, checkedAt: nowIso() };
    },
  };
}

describe("HealthAggregator", () => {
  it("is ready only when every component is healthy", async () => {
    const agg = new HealthAggregator();
    agg.register("a", checkable(HealthState.HEALTHY));
    agg.register("b", checkable(HealthState.HEALTHY));

    const ready = await agg.readiness();
    expect(ready.ready).toBe(true);
    expect(ready.live).toBe(true);
  });

  it("worst state wins: any unhealthy component fails readiness", async () => {
    const agg = new HealthAggregator();
    agg.register("a", checkable(HealthState.HEALTHY));
    agg.register("b", checkable(HealthState.DEGRADED));
    agg.register("c", checkable(HealthState.UNHEALTHY));

    const ready = await agg.readiness();
    expect(ready.ready).toBe(false);
    expect(ready.components?.["c"]?.state).toBe(HealthState.UNHEALTHY);
  });

  it("treats a throwing component as unhealthy", async () => {
    const agg = new HealthAggregator();
    agg.register("boom", {
      async checkHealth(): Promise<HealthReport> {
        throw new Error("down");
      },
    });
    const ready = await agg.readiness();
    expect(ready.ready).toBe(false);
    expect(ready.components?.["boom"]?.state).toBe(HealthState.UNHEALTHY);
  });
});

describe("ProviderHealthTracker", () => {
  it("transitions through degraded to down and recovers", async () => {
    const tracker = new ProviderHealthTracker("example-provider", 2);
    expect(tracker.current).toBe(ProviderState.UNKNOWN);

    tracker.recordFailure();
    expect(tracker.current).toBe(ProviderState.DEGRADED);

    tracker.recordFailure();
    expect(tracker.current).toBe(ProviderState.DOWN);
    expect((await tracker.checkHealth()).state).toBe(HealthState.UNHEALTHY);

    tracker.recordSuccess();
    expect(tracker.current).toBe(ProviderState.UP);
    expect((await tracker.checkHealth()).state).toBe(HealthState.HEALTHY);
  });
});

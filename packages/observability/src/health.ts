/**
 * Health aggregation across HealthCheckable components plus a provider health
 * tracker with explicit state transitions.
 *
 * Aggregation uses worst-state-wins: one unhealthy component makes readiness
 * fail.
 */

import {
  nowIso,
  HealthState,
  type HealthCheckable,
  type HealthReport,
  type ProbeStatus,
} from "@ascended/core";

/** Rank health states so the worst one can be selected. */
function stateRank(state: HealthState): number {
  switch (state) {
    case HealthState.HEALTHY:
      return 0;
    case HealthState.DEGRADED:
      return 1;
    case HealthState.UNHEALTHY:
      return 2;
  }
}

/**
 * Aggregates health across registered components. Liveness reflects that the
 * process runs; readiness composes component reports (worst-state-wins).
 */
export class HealthAggregator {
  private readonly components = new Map<string, HealthCheckable>();

  /** Register a named component to include in readiness. */
  register(name: string, checkable: HealthCheckable): void {
    this.components.set(name, checkable);
  }

  /** Remove a component from readiness. */
  unregister(name: string): void {
    this.components.delete(name);
  }

  /**
   * Readiness: whether the system can serve traffic. Ready when every
   * component reports HEALTHY (DEGRADED and UNHEALTHY both fail readiness).
   */
  async readiness(): Promise<ProbeStatus> {
    const reports: Record<string, HealthReport> = {};
    let worst = HealthState.HEALTHY;

    await Promise.all(
      [...this.components].map(async ([name, checkable]) => {
        const report = await safeCheck(checkable);
        reports[name] = report;
        if (stateRank(report.state) > stateRank(worst)) {
          worst = report.state;
        }
      }),
    );

    return {
      live: true,
      ready: worst === HealthState.HEALTHY,
      components: reports,
    };
  }

  /** Liveness: the process is running. Always live once reachable. */
  liveness(): ProbeStatus {
    return { live: true, ready: false };
  }
}

async function safeCheck(checkable: HealthCheckable): Promise<HealthReport> {
  try {
    return await checkable.checkHealth();
  } catch (error) {
    return {
      state: HealthState.UNHEALTHY,
      reason: error instanceof Error ? error.message : "health check failed",
      checkedAt: nowIso(),
    };
  }
}

/** Lifecycle states a tracked provider can be in. */
export enum ProviderState {
  /** Not yet observed. */
  UNKNOWN = "unknown",
  /** Serving normally. */
  UP = "up",
  /** Serving with reduced quality. */
  DEGRADED = "degraded",
  /** Not serving. */
  DOWN = "down",
}

/**
 * Tracks a single provider's state via observed successes and failures and
 * exposes it as a {@link HealthCheckable}. Consecutive failures trip the
 * provider to DOWN; a success recovers it to UP.
 */
export class ProviderHealthTracker implements HealthCheckable {
  private state: ProviderState = ProviderState.UNKNOWN;
  private consecutiveFailures = 0;

  constructor(
    private readonly name: string,
    private readonly failureThreshold = 3,
  ) {}

  /** Record a successful interaction; recovers the provider to UP. */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = ProviderState.UP;
  }

  /** Record a failure; trips to DOWN once the threshold is reached. */
  recordFailure(): void {
    this.consecutiveFailures += 1;
    this.state =
      this.consecutiveFailures >= this.failureThreshold
        ? ProviderState.DOWN
        : ProviderState.DEGRADED;
  }

  /** The current tracked state. */
  get current(): ProviderState {
    return this.state;
  }

  async checkHealth(): Promise<HealthReport> {
    return {
      state: toHealthState(this.state),
      reason:
        this.state === ProviderState.UP || this.state === ProviderState.UNKNOWN
          ? undefined
          : `provider "${this.name}" ${this.state}`,
      checkedAt: nowIso(),
      details: {
        provider: this.name,
        state: this.state,
        consecutiveFailures: this.consecutiveFailures,
      },
    };
  }
}

function toHealthState(state: ProviderState): HealthState {
  switch (state) {
    case ProviderState.UP:
      return HealthState.HEALTHY;
    case ProviderState.DEGRADED:
      return HealthState.DEGRADED;
    case ProviderState.DOWN:
      return HealthState.UNHEALTHY;
    case ProviderState.UNKNOWN:
      return HealthState.HEALTHY;
  }
}

/**
 * Rate limiter port plus an in-memory fixed-window adapter.
 */

import {
  nowIso,
  HealthState,
  type HealthCheckable,
  type HealthReport,
} from "@third-eye-cyborg/ascended-core";

/** The outcome of attempting to consume rate-limit budget. */
export interface RateLimitDecision {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Remaining budget in the current window (never negative). */
  remaining: number;
  /** When denied, seconds until budget resets. */
  retryAfterSeconds?: number;
}

/** Rate limiter port. */
export interface RateLimiterPort {
  /** Consume `cost` (default 1) units of budget for `key`. */
  consume(key: string, cost?: number): Promise<RateLimitDecision>;
}

/** Options for {@link FixedWindowRateLimiter}. */
export interface FixedWindowRateLimiterOptions {
  /** Maximum units allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
}

interface WindowState {
  windowStart: number;
  used: number;
}

/**
 * In-memory fixed-window rate limiter. Each key tracks usage within the
 * current window; usage resets when the window rolls over. The clock is
 * injectable so tests are fully deterministic.
 */
export class FixedWindowRateLimiter
  implements RateLimiterPort, HealthCheckable
{
  private readonly windows = new Map<string, WindowState>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => Date;

  constructor(options: FixedWindowRateLimiterOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.now = options.now ?? (() => new Date());
  }

  async consume(key: string, cost = 1): Promise<RateLimitDecision> {
    const nowMs = this.now().getTime();
    const currentStart = nowMs - (nowMs % this.windowMs);
    let state = this.windows.get(key);
    if (state === undefined || state.windowStart !== currentStart) {
      state = { windowStart: currentStart, used: 0 };
      this.windows.set(key, state);
    }

    const resetInMs = currentStart + this.windowMs - nowMs;
    const retryAfterSeconds = Math.ceil(resetInMs / 1000);

    if (state.used + cost > this.limit) {
      return {
        allowed: false,
        remaining: Math.max(0, this.limit - state.used),
        retryAfterSeconds,
      };
    }

    state.used += cost;
    return { allowed: true, remaining: Math.max(0, this.limit - state.used) };
  }

  async checkHealth(): Promise<HealthReport> {
    return {
      state: HealthState.HEALTHY,
      checkedAt: nowIso(),
      details: { trackedKeys: this.windows.size },
    };
  }
}

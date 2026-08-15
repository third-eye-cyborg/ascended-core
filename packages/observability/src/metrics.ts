/**
 * Metrics port plus an in-memory collector with snapshot support.
 */

/** Dimensional tags attached to a metric sample. */
export type MetricTags = Record<string, string>;

/** Metrics emission port. */
export interface MetricsPort {
  /** Increment a counter by 1 (or a custom amount is intentionally omitted). */
  increment(name: string, tags?: MetricTags): void;
  /** Record a timing/duration sample in milliseconds. */
  timing(name: string, ms: number, tags?: MetricTags): void;
  /** Set a gauge to an absolute value. */
  gauge(name: string, value: number, tags?: MetricTags): void;
}

/** A point-in-time view of collected metrics. */
export interface MetricsSnapshot {
  /** Counter totals keyed by metric key (name plus serialized tags). */
  counters: Record<string, number>;
  /** All timing samples keyed by metric key. */
  timings: Record<string, number[]>;
  /** Latest gauge value keyed by metric key. */
  gauges: Record<string, number>;
}

/** In-memory {@link MetricsPort} that supports snapshotting for assertions. */
export class InMemoryMetrics implements MetricsPort {
  private readonly counters = new Map<string, number>();
  private readonly timings = new Map<string, number[]>();
  private readonly gauges = new Map<string, number>();

  increment(name: string, tags?: MetricTags): void {
    const key = metricKey(name, tags);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  timing(name: string, ms: number, tags?: MetricTags): void {
    const key = metricKey(name, tags);
    const samples = this.timings.get(key) ?? [];
    samples.push(ms);
    this.timings.set(key, samples);
  }

  gauge(name: string, value: number, tags?: MetricTags): void {
    this.gauges.set(metricKey(name, tags), value);
  }

  /** Produce an immutable-ish snapshot of all collected metrics. */
  snapshot(): MetricsSnapshot {
    return {
      counters: Object.fromEntries(this.counters),
      timings: Object.fromEntries(
        [...this.timings].map(([k, v]) => [k, [...v]]),
      ),
      gauges: Object.fromEntries(this.gauges),
    };
  }

  /** Reset all collected metrics. */
  reset(): void {
    this.counters.clear();
    this.timings.clear();
    this.gauges.clear();
  }
}

/** Build a stable metric key from a name and sorted tags. */
export function metricKey(name: string, tags?: MetricTags): string {
  if (tags === undefined) return name;
  const serialized = Object.keys(tags)
    .sort()
    .map((k) => `${k}=${tags[k] ?? ""}`)
    .join(",");
  return serialized.length === 0 ? name : `${name}{${serialized}}`;
}

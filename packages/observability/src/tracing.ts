/**
 * Tracing port plus an in-memory tracer for tests and examples.
 */

import {
  createId,
  nowIso,
  parseIsoTimestamp,
  type IsoTimestamp,
  type Metadata,
} from "@third-eye-cyborg/ascended-core";

/** Terminal status of a span. */
export type SpanStatus = "ok" | "error";

/** Redaction-safe span attributes. */
export type SpanAttributes = Metadata;

/** A started span that must be ended. */
export interface Span {
  /** End the span with a status (defaults to "ok"). */
  end(status?: SpanStatus): void;
  /** Attach an error to the span and mark it errored. */
  recordError(err: unknown): void;
}

/** Tracing port. */
export interface TracerPort {
  /** Start a new span with an optional attribute bag. */
  startSpan(name: string, attrs?: SpanAttributes): Span;
}

/** A finished span captured by {@link InMemoryTracer}. */
export interface FinishedSpan {
  spanId: string;
  name: string;
  status: SpanStatus;
  startedAt: IsoTimestamp;
  endedAt: IsoTimestamp;
  durationMs: number;
  attributes?: SpanAttributes;
  /** Redaction-safe error message when the span errored. */
  errorMessage?: string;
}

/** In-memory {@link TracerPort} recording finished spans for assertions. */
export class InMemoryTracer implements TracerPort {
  private readonly finished: FinishedSpan[] = [];
  private readonly now: () => IsoTimestamp;

  constructor(options: { now?: () => IsoTimestamp } = {}) {
    this.now = options.now ?? nowIso;
  }

  startSpan(name: string, attrs?: SpanAttributes): Span {
    const spanId = createId("span");
    const startedAt = this.now();
    let ended = false;
    let errorMessage: string | undefined;

    const finish = (status: SpanStatus): void => {
      if (ended) return;
      ended = true;
      const endedAt = this.now();
      const durationMs =
        parseIsoTimestamp(endedAt).getTime() -
        parseIsoTimestamp(startedAt).getTime();
      const record: FinishedSpan = {
        spanId,
        name,
        status,
        startedAt,
        endedAt,
        durationMs,
      };
      if (attrs !== undefined) record.attributes = attrs;
      if (errorMessage !== undefined) record.errorMessage = errorMessage;
      this.finished.push(record);
    };

    return {
      end(status: SpanStatus = "ok"): void {
        finish(status);
      },
      recordError(err: unknown): void {
        errorMessage = err instanceof Error ? err.message : String(err);
        finish("error");
      },
    };
  }

  /** All finished spans, in completion order. */
  get spans(): readonly FinishedSpan[] {
    return this.finished;
  }

  /** Clear recorded spans. */
  clear(): void {
    this.finished.length = 0;
  }
}

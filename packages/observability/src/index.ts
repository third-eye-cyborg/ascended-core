/**
 * @third-eye-cyborg/ascended-observability
 *
 * Request-scoped context, redaction-safe structured logging, metrics, tracing,
 * and health aggregation with in-memory collectors for tests and examples.
 */

export {
  type RequestScope,
  type CreateRequestScopeInput,
  createRequestScope,
  withRequestScope,
  getRequestScope,
} from "./context";

export {
  type LogLevel,
  type LogFields,
  type Logger,
  type LogRecord,
  LOG_FORBIDDEN_KEYS,
  redactFields,
  ConsoleLogger,
  InMemoryLogger,
} from "./logger";

export {
  type MetricTags,
  type MetricsPort,
  type MetricsSnapshot,
  InMemoryMetrics,
  metricKey,
} from "./metrics";

export {
  type SpanStatus,
  type SpanAttributes,
  type Span,
  type TracerPort,
  type FinishedSpan,
  InMemoryTracer,
} from "./tracing";

export {
  HealthAggregator,
  ProviderState,
  ProviderHealthTracker,
} from "./health";

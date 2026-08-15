/**
 * Error primitives shared across every Ascended Core package.
 */

export enum ErrorCode {
  UNKNOWN = "UNKNOWN",
  VALIDATION = "VALIDATION",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  CONFLICT = "CONFLICT",
  RATE_LIMITED = "RATE_LIMITED",
  PRIVACY_BLOCKED = "PRIVACY_BLOCKED",
  PROVIDER_ERROR = "PROVIDER_ERROR",
  PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT",
  UNAVAILABLE = "UNAVAILABLE",
  UNSUPPORTED = "UNSUPPORTED",
}

export interface CoreErrorDetails {
  /** Machine-readable error code. */
  code: ErrorCode | string;
  /** Human-readable, user-safe message. Never include secrets or PII. */
  message: string;
  /** Optional HTTP-style status code for adapters that map to HTTP. */
  statusCode?: number;
  /** Redaction-safe structured context. */
  context?: Record<string, unknown>;
  /** Optional underlying cause. */
  cause?: unknown;
}

/**
 * CoreError is the canonical throwable for all Ascended Core packages.
 * It carries a stable machine code plus redaction-safe context so that
 * telemetry pipelines can record failures without leaking user data.
 */
export class CoreError extends Error {
  readonly code: ErrorCode | string;
  readonly statusCode?: number;
  readonly context?: Record<string, unknown>;

  constructor(details: CoreErrorDetails) {
    super(details.message);
    this.name = "CoreError";
    this.code = details.code;
    if (details.statusCode !== undefined) this.statusCode = details.statusCode;
    if (details.context !== undefined) this.context = details.context;
    if (details.cause !== undefined) this.cause = details.cause;
  }

  static isCoreError(value: unknown): value is CoreError {
    return value instanceof CoreError;
  }

  static from(
    error: unknown,
    fallback: { code: ErrorCode | string; message: string },
  ): CoreError {
    if (CoreError.isCoreError(error)) return error;
    const message = error instanceof Error ? error.message : fallback.message;
    return new CoreError({ code: fallback.code, message, cause: error });
  }
}

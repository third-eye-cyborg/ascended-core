/**
 * Structured logging with a redaction guard.
 *
 * `fields` are structured context. Keys that commonly carry sensitive data are
 * stripped before a record is emitted so logs stay redaction-safe by default.
 */

import { nowIso, type IsoTimestamp } from "@third-eye-cyborg/ascended-core";

/** Severity levels, ordered least to most severe. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured, redaction-safe context attached to a log line. */
export type LogFields = Record<string, unknown>;

/** Logger contract. */
export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

/** A structured log record after redaction. */
export interface LogRecord {
  level: LogLevel;
  msg: string;
  fields?: LogFields;
  timestamp: IsoTimestamp;
}

/**
 * Field keys that must never be logged verbatim. Comparison is
 * case-insensitive and substring-based so `userEmail`, `authToken`,
 * `promptText`, etc. are all caught.
 */
export const LOG_FORBIDDEN_KEYS: readonly string[] = [
  "authorization",
  "content",
  "body",
  "prompt",
  "token",
  "email",
  "password",
  "secret",
];

const REDACTED = "[redacted]";

/**
 * Strip or mask forbidden keys from a fields bag. Redaction is recursive:
 * nested objects and arrays are walked so that shapes like
 * `{ request: { authorization: "…" } }` can never leak verbatim.
 */
export function redactFields(fields?: LogFields): LogFields | undefined {
  if (fields === undefined) return undefined;
  return redactValue(fields, "") as LogFields;
}

function redactValue(value: unknown, key: string): unknown {
  if (key !== "" && isForbiddenKey(key)) return REDACTED;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, ""));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      out[childKey] = redactValue(childValue, childKey);
    }
    return out;
  }
  return value;
}

function isForbiddenKey(key: string): boolean {
  const lower = key.toLowerCase();
  return LOG_FORBIDDEN_KEYS.some((forbidden) => lower.includes(forbidden));
}

function build(level: LogLevel, msg: string, fields?: LogFields): LogRecord {
  const redacted = redactFields(fields);
  const record: LogRecord = { level, msg, timestamp: nowIso() };
  if (redacted !== undefined) record.fields = redacted;
  return record;
}

/** Logger that writes redacted records to the console. */
export class ConsoleLogger implements Logger {
  debug(msg: string, fields?: LogFields): void {
    console.debug(build("debug", msg, fields));
  }
  info(msg: string, fields?: LogFields): void {
    console.info(build("info", msg, fields));
  }
  warn(msg: string, fields?: LogFields): void {
    console.warn(build("warn", msg, fields));
  }
  error(msg: string, fields?: LogFields): void {
    console.error(build("error", msg, fields));
  }
}

/** Logger that retains redacted records in memory for assertions. */
export class InMemoryLogger implements Logger {
  private readonly logs: LogRecord[] = [];

  debug(msg: string, fields?: LogFields): void {
    this.logs.push(build("debug", msg, fields));
  }
  info(msg: string, fields?: LogFields): void {
    this.logs.push(build("info", msg, fields));
  }
  warn(msg: string, fields?: LogFields): void {
    this.logs.push(build("warn", msg, fields));
  }
  error(msg: string, fields?: LogFields): void {
    this.logs.push(build("error", msg, fields));
  }

  /** All records so far, in log order. */
  get records(): readonly LogRecord[] {
    return this.logs;
  }

  /** Clear recorded records. */
  clear(): void {
    this.logs.length = 0;
  }
}

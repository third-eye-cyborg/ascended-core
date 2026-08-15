/**
 * Time primitives. Core contracts exchange ISO-8601 UTC timestamps as strings
 * so payloads remain language- and storage-agnostic.
 */

/** ISO-8601 timestamp string, e.g. "2026-08-14T20:00:00.000Z". */
export type IsoTimestamp = string & { readonly __brand: "IsoTimestamp" };

export function toIsoTimestamp(date: Date): IsoTimestamp {
  return date.toISOString() as IsoTimestamp;
}

export function nowIso(): IsoTimestamp {
  return toIsoTimestamp(new Date());
}

export function parseIsoTimestamp(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO-8601 timestamp: "${value}"`);
  }
  return date;
}

/**
 * Internal guard helpers shared across bounded-context contracts.
 *
 * Not part of the public API surface; re-export intentionally omitted from
 * `src/index.ts`.
 */

/** Narrow an unknown value to a plain object record. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** True when the record carries string `createdAt` and `updatedAt` fields. */
export function hasTimestamps(value: Record<string, unknown>): boolean {
  return typeof value["createdAt"] === "string" && typeof value["updatedAt"] === "string";
}

/** True when `value` is one of the string members of the given enum object. */
export function isEnumMember<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
): value is T[keyof T] {
  return typeof value === "string" && (Object.values(enumObject) as string[]).includes(value);
}

import { describe, expect, it } from "vitest";
import {
  CoreError,
  ErrorCode,
  createId,
  err,
  idPrefix,
  isEntityId,
  ok,
  parseIsoTimestamp,
  toIsoTimestamp,
  unwrap,
} from "../src/index";

describe("CoreError", () => {
  it("carries code, message and context", () => {
    const error = new CoreError({
      code: ErrorCode.NOT_FOUND,
      message: "Profile not found",
      statusCode: 404,
      context: { resource: "profile" },
    });
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(CoreError.isCoreError(error)).toBe(true);
  });

  it("wraps foreign errors via from()", () => {
    const wrapped = CoreError.from(new Error("boom"), {
      code: ErrorCode.UNKNOWN,
      message: "fallback",
    });
    expect(wrapped.message).toBe("boom");
    expect(wrapped.code).toBe(ErrorCode.UNKNOWN);
  });
});

describe("ids", () => {
  it("creates prefixed opaque ids", () => {
    const id = createId("post");
    expect(isEntityId(id)).toBe(true);
    expect(idPrefix(id)).toBe("post");
  });

  it("rejects invalid prefixes", () => {
    expect(() => createId("Bad Prefix")).toThrow();
  });
});

describe("result", () => {
  it("unwraps ok values", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("throws on err", () => {
    expect(() => unwrap(err(new Error("nope")))).toThrow("nope");
  });
});

describe("time", () => {
  it("round-trips ISO timestamps", () => {
    const iso = toIsoTimestamp(new Date("2026-08-14T20:00:00.000Z"));
    expect(parseIsoTimestamp(iso).toISOString()).toBe(iso);
  });

  it("rejects invalid timestamps", () => {
    expect(() => parseIsoTimestamp("not-a-date")).toThrow();
  });
});

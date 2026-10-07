import { describe, expect, it } from "vitest";
import { ErrorCode } from "@third-eye-cyborg/core";

import { ApiError, statusCodeToErrorCode } from "../src/errors.js";

describe("statusCodeToErrorCode", () => {
  it("maps common HTTP statuses onto Core error codes", () => {
    expect(statusCodeToErrorCode(400)).toBe(ErrorCode.VALIDATION);
    expect(statusCodeToErrorCode(401)).toBe(ErrorCode.UNAUTHORIZED);
    expect(statusCodeToErrorCode(403)).toBe(ErrorCode.FORBIDDEN);
    expect(statusCodeToErrorCode(404)).toBe(ErrorCode.NOT_FOUND);
    expect(statusCodeToErrorCode(405)).toBe(ErrorCode.UNSUPPORTED);
    expect(statusCodeToErrorCode(409)).toBe(ErrorCode.CONFLICT);
    expect(statusCodeToErrorCode(429)).toBe(ErrorCode.RATE_LIMITED);
    expect(statusCodeToErrorCode(500)).toBe(ErrorCode.PROVIDER_ERROR);
    expect(statusCodeToErrorCode(418)).toBe(ErrorCode.PROVIDER_ERROR);
  });
});

describe("ApiError.fromStatus", () => {
  it("uses the mapped code and preserves statusCode", () => {
    const error = ApiError.fromStatus(403, "blocked");
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(ErrorCode.FORBIDDEN);
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("blocked");
  });
});

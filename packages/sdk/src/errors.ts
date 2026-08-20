/**
 * SDK error type. {@link ApiError} extends the shared {@link CoreError} so that
 * SDK callers can use the same telemetry-safe error surface as the rest of
 * Ascended Core, while adding HTTP status-code mapping.
 */

import { CoreError, ErrorCode } from "@third-eye-cyborg/core";
import type { CoreErrorDetails } from "@third-eye-cyborg/core";

/** Map an HTTP status code to a stable Core {@link ErrorCode}. */
export function statusCodeToErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 429:
      return ErrorCode.RATE_LIMITED;
    default:
      return ErrorCode.PROVIDER_ERROR;
  }
}

/** Error raised by the SDK for non-2xx responses and validation failures. */
export class ApiError extends CoreError {
  constructor(details: Omit<CoreErrorDetails, "code"> & { code?: ErrorCode | string }) {
    const statusCode = details.statusCode;
    const code =
      details.code ??
      (statusCode !== undefined
        ? statusCodeToErrorCode(statusCode)
        : ErrorCode.PROVIDER_ERROR);
    super({ ...details, code });
    this.name = "ApiError";
  }

  /** Build an ApiError from an HTTP status code, mapping to the right code. */
  static fromStatus(
    statusCode: number,
    message: string,
    context?: Record<string, unknown>,
  ): ApiError {
    return new ApiError({
      code: statusCodeToErrorCode(statusCode),
      message,
      statusCode,
      ...(context !== undefined ? { context } : {}),
    });
  }
}

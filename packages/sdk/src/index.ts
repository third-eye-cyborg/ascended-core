/**
 * Public entry point for the Ascended Core reference API SDK.
 */

export { AscendedCoreClient } from "./client.js";
export type {
  AscendedCoreClientOptions,
  FetchImpl,
  ListOptions,
} from "./client.js";
export { ApiError, statusCodeToErrorCode } from "./errors.js";
export { collectAll, paginateAll } from "./pagination.js";
export type { Page, PageFetcher } from "./pagination.js";

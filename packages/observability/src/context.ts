/**
 * Request-scoped context propagated across async boundaries via
 * AsyncLocalStorage.
 *
 * The user tag is opaque (never a raw email/name) so scopes stay
 * redaction-safe.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { createId, nowIso, type IsoTimestamp } from "@third-eye-cyborg/core";

/** Ambient context describing the in-flight request/operation. */
export interface RequestScope {
  /** Opaque per-request identifier. */
  requestId: string;
  /** Distributed trace identifier. */
  traceId: string;
  /** Current span identifier. */
  spanId: string;
  /** Parent span identifier, when this is a child span. */
  parentSpanId?: string;
  /** Opaque, non-PII user tag (e.g. a hashed or surrogate id). */
  userIdTag?: string;
  /** When the scope was created. */
  startedAt: IsoTimestamp;
}

const storage = new AsyncLocalStorage<RequestScope>();

/** Fields a caller may supply when creating a scope; the rest are generated. */
export interface CreateRequestScopeInput {
  requestId?: string;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  userIdTag?: string;
}

/** Create a new {@link RequestScope}, generating any missing ids. */
export function createRequestScope(
  input: CreateRequestScopeInput = {},
): RequestScope {
  const scope: RequestScope = {
    requestId: input.requestId ?? createId("req"),
    traceId: input.traceId ?? createId("trace"),
    spanId: input.spanId ?? createId("span"),
    startedAt: nowIso(),
  };
  if (input.parentSpanId !== undefined) scope.parentSpanId = input.parentSpanId;
  if (input.userIdTag !== undefined) scope.userIdTag = input.userIdTag;
  return scope;
}

/** Run `fn` with `scope` as the ambient request scope. */
export function withRequestScope<T>(scope: RequestScope, fn: () => T): T {
  return storage.run(scope, fn);
}

/** Get the current ambient request scope, or `undefined` when none is active. */
export function getRequestScope(): RequestScope | undefined {
  return storage.getStore();
}

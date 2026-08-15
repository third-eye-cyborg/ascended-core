/**
 * Cursor pagination helpers for the reference API's `{ items, nextCursor }`
 * page shape.
 */

/** A single page of results using cursor pagination. */
export interface Page<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string | undefined;
}

/** Fetches one page given an optional cursor. */
export type PageFetcher<T> = (cursor?: string) => Promise<Page<T>>;

/**
 * Walk every page produced by `fn`, yielding items one at a time. Terminates
 * when a page returns no `nextCursor`. Guards against a server that repeats a
 * cursor indefinitely.
 */
export async function* paginateAll<T>(fn: PageFetcher<T>): AsyncGenerator<T> {
  let cursor: string | undefined;
  const seen = new Set<string>();
  for (;;) {
    const page = await fn(cursor);
    for (const item of page.items) {
      yield item;
    }
    const next = page.nextCursor;
    if (next === undefined || next === "") return;
    if (seen.has(next)) {
      throw new Error(
        `paginateAll detected a repeated cursor "${next}"; aborting to avoid an infinite loop.`,
      );
    }
    seen.add(next);
    cursor = next;
  }
}

/** Collect every item from a paginated fetcher into an array. */
export async function collectAll<T>(fn: PageFetcher<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of paginateAll(fn)) {
    out.push(item);
  }
  return out;
}

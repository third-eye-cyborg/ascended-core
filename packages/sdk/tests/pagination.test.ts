import { describe, expect, it, vi } from "vitest";

import { AscendedCoreClient } from "../src/client.js";
import { collectAll, paginateAll } from "../src/pagination.js";
import type { FetchImpl } from "../src/client.js";
import type { Page } from "../src/pagination.js";

describe("paginateAll", () => {
  it("walks two pages and stops when nextCursor is absent", async () => {
    const pages: Array<Page<number>> = [
      { items: [1, 2], nextCursor: "cursor_2" },
      { items: [3, 4] },
    ];
    const fn = vi.fn(async (cursor?: string): Promise<Page<number>> => {
      if (cursor === undefined) return pages[0]!;
      if (cursor === "cursor_2") return pages[1]!;
      throw new Error(`unexpected cursor ${cursor}`);
    });

    const collected: number[] = [];
    for await (const item of paginateAll(fn)) collected.push(item);

    expect(collected).toEqual([1, 2, 3, 4]);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0]![0]).toBeUndefined();
    expect(fn.mock.calls[1]![0]).toBe("cursor_2");
  });

  it("collectAll returns every item", async () => {
    const fn = async (cursor?: string): Promise<Page<string>> =>
      cursor === undefined
        ? { items: ["a"], nextCursor: "c2" }
        : { items: ["b"] };
    expect(await collectAll(fn)).toEqual(["a", "b"]);
  });

  it("aborts on a repeated cursor to avoid infinite loops", async () => {
    const fn = async (): Promise<Page<number>> => ({
      items: [1],
      nextCursor: "loop",
    });
    await expect(collectAll(fn)).rejects.toThrow(/repeated cursor/);
  });

  it("paginates a real client listing across two pages", async () => {
    const post = (id: string) => ({
      id,
      authorId: "prof_AdaExample000001",
      content: "Hello from the reference API.",
      createdAt: "2024-01-01T00:00:00.000Z",
    });
    const responses: Record<string, unknown> = {
      first: { items: [post("post_1")], nextCursor: "cursor_2" },
      second: { items: [post("post_2")] },
    };
    const fetchImpl = vi.fn<FetchImpl>().mockImplementation(async (url) => {
      const body = url.includes("cursor=cursor_2")
        ? responses.second
        : responses.first;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = new AscendedCoreClient({
      baseUrl: "https://api.example.org",
      apiKey: "token_ada",
      fetchImpl,
    });

    const ids: string[] = [];
    for await (const item of paginateAll((cursor) =>
      client.listPosts({ cursor }),
    )) {
      ids.push(item.id);
    }
    expect(ids).toEqual(["post_1", "post_2"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

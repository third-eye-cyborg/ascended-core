import { ErrorCode } from "@third-eye-cyborg/ascended-core";
import { describe, expect, it, vi } from "vitest";

import { AscendedCoreClient } from "../src/client.js";
import { ApiError } from "../src/errors.js";
import type { FetchImpl } from "../src/client.js";

const BASE_URL = "https://api.example.org";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const adaProfile = {
  id: "prof_AdaExample000001",
  accountId: "acct_AdaExample00001",
  displayName: "Ada Example",
  bio: "Curious about community software.",
  avatarUrl: "https://example.org/avatars/ada.png",
};

describe("AscendedCoreClient", () => {
  it("constructs the URL and sends the bearer auth header", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse(adaProfile),
    );
    const client = new AscendedCoreClient({
      baseUrl: `${BASE_URL}/`,
      apiKey: "token_ada",
      fetchImpl,
    });

    const profile = await client.getMyProfile();
    expect(profile).toEqual(adaProfile);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE_URL}/profiles/me`);
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer token_ada");
  });

  it("encodes path params and query string for list operations", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse({ items: [], nextCursor: undefined }),
    );
    const client = new AscendedCoreClient({
      baseUrl: BASE_URL,
      apiKey: "token_ada",
      fetchImpl,
    });

    await client.listPosts({ cursor: "cur sor", limit: 5 });
    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE_URL}/posts?cursor=cur+sor&limit=5`);
  });

  it("encodes dynamic path segments", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse(adaProfile),
    );
    const client = new AscendedCoreClient({
      baseUrl: BASE_URL,
      apiKey: "token_ada",
      fetchImpl,
    });
    await client.getProfile("prof/with space");
    const [url] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(`${BASE_URL}/profiles/prof%2Fwith%20space`);
  });

  it("serializes request bodies as JSON", async () => {
    const created = {
      id: "post_AdaExample000001",
      authorId: "prof_AdaExample000001",
      content: "Hello from the reference API.",
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse(created, 201),
    );
    const client = new AscendedCoreClient({
      baseUrl: BASE_URL,
      apiKey: "token_ada",
      fetchImpl,
    });
    const post = await client.createPost({ content: "Hello from the reference API." });
    expect(post).toEqual(created);
    const [, init] = fetchImpl.mock.calls[0]!;
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      content: "Hello from the reference API.",
    });
    expect((init?.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
  });

  it("does not send an auth header for unauthenticated operations", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse({ status: "ok", version: "0.1.0" }),
    );
    const client = new AscendedCoreClient({ baseUrl: BASE_URL, fetchImpl });
    const health = await client.getHealthz();
    expect(health.status).toBe("ok");
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init?.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("throws UNAUTHORIZED before fetching when auth is required but missing", async () => {
    const fetchImpl = vi.fn<FetchImpl>();
    const client = new AscendedCoreClient({ baseUrl: BASE_URL, fetchImpl });
    await expect(client.getMyProfile()).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps status codes to ApiError codes", async () => {
    const cases: Array<[number, ErrorCode]> = [
      [401, ErrorCode.UNAUTHORIZED],
      [404, ErrorCode.NOT_FOUND],
      [429, ErrorCode.RATE_LIMITED],
      [500, ErrorCode.PROVIDER_ERROR],
    ];
    for (const [status, expected] of cases) {
      const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
        jsonResponse(
          { error: "failure", message: "boom", code: undefined },
          status,
        ),
      );
      const client = new AscendedCoreClient({
        baseUrl: BASE_URL,
        apiKey: "token_ada",
        fetchImpl,
      });
      const error = await client.getMyProfile().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe(expected);
      expect((error as ApiError).statusCode).toBe(status);
    }
  });

  it("throws a VALIDATION ApiError when the response fails schema validation", async () => {
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse({ id: "prof_1" }), // missing required fields
    );
    const client = new AscendedCoreClient({
      baseUrl: BASE_URL,
      apiKey: "token_ada",
      fetchImpl,
    });
    const error = await client.getMyProfile().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(ErrorCode.VALIDATION);
  });

  it("skips validation when validateResponses is false", async () => {
    const malformed = { id: "prof_1" };
    const fetchImpl = vi.fn<FetchImpl>().mockResolvedValue(
      jsonResponse(malformed),
    );
    const client = new AscendedCoreClient({
      baseUrl: BASE_URL,
      apiKey: "token_ada",
      fetchImpl,
      validateResponses: false,
    });
    const profile = await client.getMyProfile();
    expect(profile).toEqual(malformed);
  });
});

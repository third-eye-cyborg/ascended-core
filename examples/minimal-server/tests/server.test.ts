import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createId } from "@third-eye-cyborg/core";

import { createServer, type RunningServer } from "../src/server.js";
import { runDemoFlow } from "../src/demo-flow.js";
import { demoTokenFor } from "../src/store.js";

let server: RunningServer;

beforeAll(async () => {
  server = await createServer({ port: 0 }).listen();
});

afterAll(async () => {
  await server.close();
});

function tokenHeader(): { authorization: string } {
  return { authorization: `Bearer ${demoTokenFor(createId("acct"))}` };
}

async function call(
  method: string,
  path: string,
  init: { token?: Record<string, string>; body?: unknown } = {},
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (init.token) Object.assign(headers, init.token);
  const response = await fetch(`${server.baseUrl}${path}`, {
    method,
    headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await response.text();
  return { status: response.status, json: text.length > 0 ? JSON.parse(text) : undefined };
}

describe("reference minimal server", () => {
  it("serves the public health check without auth", async () => {
    const res = await call("GET", "/healthz");
    expect(res.status).toBe(200);
    expect((res.json as { status: string }).status).toBe("ok");
  });

  it("runs the full demo flow end to end", async () => {
    const result = await runDemoFlow(server);
    const failed = result.steps.filter((step) => !step.ok);
    expect(failed, JSON.stringify(failed)).toHaveLength(0);
    expect(result.ok).toBe(true);
  });

  it("supports the happy path across profiles, posts and reactions", async () => {
    const author = tokenHeader();
    const reactor = tokenHeader();

    const profile = await call("PUT", "/profiles/me", {
      token: author,
      body: { displayName: "Ada Example" },
    });
    expect(profile.status).toBe(200);
    const profileId = (profile.json as { id: string }).id;

    const fetched = await call("GET", `/profiles/${profileId}`, { token: reactor });
    expect(fetched.status).toBe(200);
    expect((fetched.json as { displayName: string }).displayName).toBe("Ada Example");

    const post = await call("POST", "/posts", {
      token: author,
      body: { content: "Reference post body." },
    });
    expect(post.status).toBe(201);
    const postId = (post.json as { id: string }).id;
    expect((post.json as { content: string }).content).toBe("Reference post body.");

    const list = await call("GET", "/posts", { token: reactor });
    expect(list.status).toBe(200);
    expect((list.json as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);

    const reaction = await call("POST", `/posts/${postId}/reactions`, {
      token: reactor,
      body: { kind: "celebrate" },
    });
    expect(reaction.status).toBe(201);
    expect((reaction.json as { kind: string }).kind).toBe("celebrate");

    // The author should have received an in-app notification.
    const notifications = await call("GET", "/notifications/me", { token: author });
    expect(notifications.status).toBe(200);
    expect((notifications.json as { items: unknown[] }).items.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 401 when the bearer token is missing", async () => {
    const res = await call("GET", "/profiles/me");
    expect(res.status).toBe(401);
    expect((res.json as { code: string }).code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when the bearer token is malformed", async () => {
    const response = await fetch(`${server.baseUrl}/profiles/me`, {
      method: "GET",
      headers: { authorization: "Bearer not-a-demo-token" },
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 when a post body is missing required fields", async () => {
    const res = await call("POST", "/posts", { token: tokenHeader(), body: {} });
    expect(res.status).toBe(400);
    expect((res.json as { code: string }).code).toBe("VALIDATION");
  });

  it("returns 400 when the JSON body is malformed", async () => {
    const response = await fetch(`${server.baseUrl}/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", ...tokenHeader() },
      body: "{ not json",
    });
    expect(response.status).toBe(400);
  });

  it("paginates /notifications/me with cursor and limit", async () => {
    const author = tokenHeader();
    const reactor = tokenHeader();
    const post = await call("POST", "/posts", {
      token: author,
      body: { content: "Paginated notification source." },
    });
    const postId = (post.json as { id: string }).id;
    for (let i = 0; i < 3; i += 1) {
      const reaction = await call("POST", `/posts/${postId}/reactions`, {
        token: reactor,
        body: { kind: `celebrate-${i}` },
      });
      expect(reaction.status).toBe(201);
    }

    const first = await call("GET", "/notifications/me?limit=2", { token: author });
    expect(first.status).toBe(200);
    const firstPage = first.json as { items: unknown[]; nextCursor?: string };
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).toBeDefined();

    const second = await call("GET", `/notifications/me?limit=2&cursor=${firstPage.nextCursor}`, {
      token: author,
    });
    expect(second.status).toBe(200);
    const secondPage = second.json as { items: unknown[]; nextCursor?: string };
    expect(secondPage.items.length).toBeGreaterThanOrEqual(1);
  });

  it("treats a second community join as idempotent", async () => {
    const member = tokenHeader();
    const created = await call("POST", "/communities", {
      token: member,
      body: { name: "Example Circle" },
    });
    const communityId = (created.json as { id: string }).id;
    const first = await call("POST", `/communities/${communityId}/join`, { token: member });
    const second = await call("POST", `/communities/${communityId}/join`, { token: member });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((second.json as { communityId: string }).communityId).toBe(communityId);
  });

  it("updates an existing RSVP instead of creating a duplicate", async () => {
    const host = tokenHeader();
    const created = await call("POST", "/events", {
      token: host,
      body: { title: "Example Gathering", startsAt: "2026-10-08T18:00:00.000Z" },
    });
    const eventId = (created.json as { id: string }).id;
    const first = await call("POST", `/events/${eventId}/rsvp`, {
      token: host,
      body: { status: "going" },
    });
    const second = await call("POST", `/events/${eventId}/rsvp`, {
      token: host,
      body: { status: "maybe" },
    });
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((second.json as { status: string }).status).toBe("maybe");
  });

  it("returns 405 UNSUPPORTED for a disallowed method", async () => {
    const res = await call("DELETE", "/posts", { token: tokenHeader() });
    expect(res.status).toBe(405);
    expect((res.json as { code: string }).code).toBe("UNSUPPORTED");
  });

  it("returns 401 when the demo token suffix is not an entity id", async () => {
    const response = await fetch(`${server.baseUrl}/profiles/me`, {
      method: "GET",
      headers: { authorization: "Bearer test-not-an-id" },
    });
    expect(response.status).toBe(401);
  });

  it("publishes a domain event when a post is created", async () => {
    const captured: string[] = [];
    server.platform.bus.subscribe("content.post_published", (event) => {
      captured.push(event.type);
    });
    const res = await call("POST", "/posts", {
      token: tokenHeader(),
      body: { content: "Event-emitting post." },
    });
    expect(res.status).toBe(201);
    expect(captured).toContain("content.post_published");
  });
});

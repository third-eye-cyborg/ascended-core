import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createId } from "@third-eye-cyborg/ascended-core";

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

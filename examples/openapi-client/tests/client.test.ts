/**
 * Boots the reference minimal server on an ephemeral port and runs the SDK
 * demo flow against it, asserting every step succeeds.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createId } from "@ascended/core";
import {
  createServer,
  demoTokenFor,
  type RunningServer,
} from "@ascended/example-minimal-server";

import { runApiDemo } from "../src/demo.js";

let server: RunningServer;

beforeAll(async () => {
  server = await createServer({ port: 0 }).listen();
});

afterAll(async () => {
  await server.close();
});

describe("openapi-client demo", () => {
  it("runs the full SDK flow against the reference server", async () => {
    const result = await runApiDemo({
      baseUrl: server.baseUrl,
      apiKey: demoTokenFor(createId("acct")),
    });

    expect(result.ok).toBe(true);
    const names = result.steps.map((s) => s.name);
    expect(names).toEqual([
      "health",
      "profile.update",
      "profile.get",
      "posts.create",
      "posts.list",
      "reactions.add",
      "communities.create",
      "communities.join",
      "notifications.list",
    ]);
    // Two posts were created; pagination with limit=1 must collect both.
    const listStep = result.steps.find((s) => s.name === "posts.list");
    expect(listStep?.detail).toBe("collected=2");
  });
});

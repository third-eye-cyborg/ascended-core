/**
 * A programmatic, end-to-end demo of the reference server exercised over HTTP.
 *
 * The flow provisions two synthetic members (Ada Example and Grace Example),
 * publishes a post, reacts to it, joins a community, RSVPs to an event, and
 * confirms the reaction notification landed in the author's inbox. Every step
 * is reported so callers (tests, the smoke script) can print a summary.
 */

import { createId, type EntityId } from "@third-eye-cyborg/core";

import { demoTokenFor } from "./store.js";
import type { RunningServer } from "./server.js";

/** A single reported demo step. */
export interface DemoStep {
  /** Short machine-readable step name. */
  name: string;
  /** Whether the step succeeded. */
  ok: boolean;
  /** Human-readable detail for logging. */
  detail: string;
}

/** The aggregate result of {@link runDemoFlow}. */
export interface DemoResult {
  /** Ordered steps that were executed. */
  steps: DemoStep[];
  /** Whether every step succeeded. */
  ok: boolean;
}

interface Actor {
  accountId: EntityId;
  token: string;
}

function actor(): Actor {
  const accountId = createId("acct");
  return { accountId, token: demoTokenFor(accountId) };
}

/**
 * Run the full reference workflow against a running server, returning the
 * ordered steps. Throws only on unexpected transport errors; contract-level
 * failures are captured as failing {@link DemoStep}s.
 */
export async function runDemoFlow(server: RunningServer): Promise<DemoResult> {
  const base = server.baseUrl;
  const steps: DemoStep[] = [];

  const ada = actor();
  const grace = actor();

  const request = async (
    token: string | null,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: unknown }> => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token !== null) headers["authorization"] = `Bearer ${token}`;
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    return { status: response.status, json: text.length > 0 ? JSON.parse(text) : undefined };
  };

  // 1. Health check (public).
  {
    const res = await request(null, "GET", "/healthz");
    steps.push({
      name: "healthz",
      ok: res.status === 200 && (res.json as { status?: string })?.status === "ok",
      detail: `status=${res.status}`,
    });
  }

  // 2. Provision two profiles.
  const adaProfile = await request(ada.token, "PUT", "/profiles/me", {
    displayName: "Ada Example",
    bio: "Reference member one.",
  });
  steps.push({
    name: "profile.ada",
    ok: adaProfile.status === 200,
    detail: `id=${(adaProfile.json as { id?: string })?.id ?? "?"}`,
  });

  const graceProfile = await request(grace.token, "PUT", "/profiles/me", {
    displayName: "Grace Example",
    bio: "Reference member two.",
  });
  steps.push({
    name: "profile.grace",
    ok: graceProfile.status === 200,
    detail: `id=${(graceProfile.json as { id?: string })?.id ?? "?"}`,
  });

  // 3. Ada publishes a post.
  const post = await request(ada.token, "POST", "/posts", {
    content: "Hello from the reference server.",
  });
  const postId = (post.json as { id?: string })?.id;
  steps.push({
    name: "post.create",
    ok: post.status === 201 && typeof postId === "string",
    detail: `id=${postId ?? "?"}`,
  });

  // 4. Grace reacts to Ada's post.
  const reaction = await request(grace.token, "POST", `/posts/${postId}/reactions`, {
    kind: "celebrate",
  });
  steps.push({
    name: "post.reaction",
    ok: reaction.status === 201,
    detail: `kind=${(reaction.json as { kind?: string })?.kind ?? "?"}`,
  });

  // 5. Grace creates and joins a community.
  const community = await request(grace.token, "POST", "/communities", {
    name: "Reference Circle",
    description: "A synthetic community for the demo.",
  });
  const communityId = (community.json as { id?: string })?.id;
  steps.push({
    name: "community.create",
    ok: community.status === 201 && typeof communityId === "string",
    detail: `id=${communityId ?? "?"}`,
  });

  const join = await request(ada.token, "POST", `/communities/${communityId}/join`, {});
  steps.push({
    name: "community.join",
    ok: join.status === 201,
    detail: `role=${(join.json as { role?: string })?.role ?? "?"}`,
  });

  // 6. Grace schedules an event; Ada RSVPs.
  const event = await request(grace.token, "POST", "/events", {
    title: "Reference Sync",
    startsAt: "2030-01-01T18:00:00.000Z",
    communityId,
  });
  const eventId = (event.json as { id?: string })?.id;
  steps.push({
    name: "event.create",
    ok: event.status === 201 && typeof eventId === "string",
    detail: `id=${eventId ?? "?"}`,
  });

  const rsvp = await request(ada.token, "POST", `/events/${eventId}/rsvp`, {
    status: "going",
  });
  steps.push({
    name: "event.rsvp",
    ok: rsvp.status === 201,
    detail: `status=${(rsvp.json as { status?: string })?.status ?? "?"}`,
  });

  // 7. Ada checks her notifications — the reaction should be delivered.
  const notifications = await request(ada.token, "GET", "/notifications/me");
  const items = (notifications.json as { items?: unknown[] })?.items ?? [];
  steps.push({
    name: "notification.delivered",
    ok: notifications.status === 200 && items.length >= 1,
    detail: `count=${items.length}`,
  });

  return { steps, ok: steps.every((step) => step.ok) };
}

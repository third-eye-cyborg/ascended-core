/**
 * End-to-end test for the reference adapter wiring: publishing a post must
 * fan out through search, audit, realtime, AI summarization, notifications,
 * metrics, and logs — all against synthetic local adapters.
 */

import { describe, expect, it } from "vitest";

import { createId } from "@third-eye-cyborg/ascended-core";

import {
  createReferencePlatform,
  feedTopic,
  SYNTHETIC_CHECKOUT_BASE_URL,
  SYNTHETIC_TEXT_PROVIDER_ID,
} from "../src/index.js";

describe("reference platform wiring", () => {
  it("fans a published post out through every adapter", async () => {
    const platform = createReferencePlatform();
    const authorId = createId("acct");

    const received: unknown[] = [];
    platform.pubsub.subscribe(feedTopic(authorId), (message) => {
      received.push(message);
    });

    const post = await platform.publishPost({
      authorId,
      body: "hello from the reference adapters",
    });

    // persistence
    expect(await platform.posts.findById(post.id)).not.toBeNull();

    // search index
    const hits = await platform.search.query("reference adapters");
    expect(hits.map((h) => h.id)).toContain(post.id);

    // audit log
    expect(
      platform.audit.entries.some(
        (r) => r.action === "content.post_published" && r.target === `post:${post.id}`,
      ),
    ).toBe(true);

    // realtime fan-out
    expect(received).toEqual([{ postId: post.id }]);

    // AI summarization (deterministic synthetic adapter)
    expect(platform.ai.callCount).toBe(1);

    // notifications across channels (all allowed by default preferences)
    const inboxItems = platform.inbox.list(authorId);
    expect(inboxItems).toHaveLength(1);
    expect(inboxItems[0]?.template).toBe("content.post_published");
    expect(typeof inboxItems[0]?.data["summary"]).toBe("string");
    expect(platform.email.sent).toHaveLength(1);
    expect(platform.push.sent).toHaveLength(1);

    // observability
    expect(platform.metrics.snapshot().counters["reference.post_published"]).toBe(1);
    expect(
      platform.logger.records.some((r) => r.msg.includes("reference pipeline")),
    ).toBe(true);

    // health: every registered component is ready after a successful pass
    const readiness = await platform.health.readiness();
    expect(readiness.ready).toBe(true);
  });

  it("reports AI capabilities and declines unsupported operations", () => {
    const platform = createReferencePlatform();
    const supported = platform.ai.checkCapability("web", "text.generate");
    expect(supported.supported).toBe(true);
    expect(supported.provider).toBe(SYNTHETIC_TEXT_PROVIDER_ID);

    const unsupported = platform.ai.checkCapability("web", "image.generate");
    expect(unsupported.supported).toBe(false);
    expect(unsupported.reason).toBeTruthy();
  });

  it("runs the synthetic billing flow end-to-end", async () => {
    const platform = createReferencePlatform();
    const accountId = createId("acct");

    const session = await platform.billing.createCheckoutSession({
      accountId,
      planId: "supporter-monthly",
      successUrl: "https://app.example.org/billing/success",
      cancelUrl: "https://app.example.org/billing/cancel",
    });
    expect(session.url.startsWith(SYNTHETIC_CHECKOUT_BASE_URL)).toBe(true);
    expect(platform.billing.sessions).toHaveLength(1);

    // The synthetic adapter grants the entitlement at checkout time.
    const entitlements = await platform.billing.getEntitlements(accountId);
    expect(entitlements).toEqual([{ key: "supporter-monthly", active: true }]);

    // Webhook can revoke it again.
    await platform.billing.handleWebhook({
      type: "entitlement.updated",
      payload: { accountId, key: "supporter-monthly", active: false },
    });
    expect(await platform.billing.getEntitlements(accountId)).toEqual([]);
  });
});

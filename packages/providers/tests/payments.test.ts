import { describe, it, expect } from "vitest";
import { createId } from "@ascended/core";
import { StubBillingAdapter } from "../src/index";

describe("StubBillingAdapter", () => {
  it("grants a synthetic supporter entitlement", async () => {
    const adapter = new StubBillingAdapter();
    const entitlements = await adapter.getEntitlements(createId("acct"));
    expect(entitlements).toEqual([{ key: "supporter", active: true }]);
  });

  it("returns a synthetic checkout session", async () => {
    const adapter = new StubBillingAdapter();
    const session = await adapter.createCheckoutSession({
      accountId: createId("acct"),
      planId: "supporter-monthly",
      successUrl: "https://example.com/ok",
      cancelUrl: "https://example.com/cancel",
    });
    expect(session.sessionId).toBeDefined();
    expect(session.url).toContain("memory://checkout");
  });
});

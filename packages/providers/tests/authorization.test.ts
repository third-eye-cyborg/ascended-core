import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/ascended-core";
import {
  AllowAllPolicy,
  RoleBasedPolicy,
  type PolicyActor,
  type PolicyResource,
} from "../src/index";

const resource: PolicyResource = { type: "document" };

describe("AllowAllPolicy", () => {
  it("allows everything", async () => {
    const policy = new AllowAllPolicy();
    const actor: PolicyActor = { accountId: createId("acct") };
    expect((await policy.can(actor, "delete", resource)).allow).toBe(true);
  });
});

describe("RoleBasedPolicy", () => {
  it("allows matching permissions and denies others", async () => {
    const policy = new RoleBasedPolicy({
      editor: ["read:document", "write:document"],
      viewer: ["read:*"],
    });
    const editor: PolicyActor = {
      accountId: createId("acct"),
      roles: ["editor"],
    };
    const viewer: PolicyActor = {
      accountId: createId("acct"),
      roles: ["viewer"],
    };

    expect((await policy.can(editor, "write", resource)).allow).toBe(true);
    expect((await policy.can(viewer, "read", resource)).allow).toBe(true);
    const denied = await policy.can(viewer, "write", resource);
    expect(denied.allow).toBe(false);
    expect(denied.reason).toBeDefined();
  });

  it("honors the global wildcard", async () => {
    const policy = new RoleBasedPolicy({ admin: ["*"] });
    const actor: PolicyActor = {
      accountId: createId("acct"),
      roles: ["admin"],
    };
    expect((await policy.can(actor, "anything", resource)).allow).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/core";
import { InMemoryAuthProvider } from "../src/index";

describe("InMemoryAuthProvider", () => {
  it("issues then verifies a session", async () => {
    const provider = new InMemoryAuthProvider();
    const accountId = createId("acct");
    const { token, session } = await provider.issueSession(accountId);

    const verified = await provider.verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.accountId).toBe(accountId);
    expect(verified?.sessionId).toBe(session.sessionId);
  });

  it("returns null for unknown tokens", async () => {
    const provider = new InMemoryAuthProvider();
    expect(await provider.verifySession("tok_missing")).toBeNull();
  });

  it("expires sessions based on the injected clock", async () => {
    let ms = 1_000_000;
    const provider = new InMemoryAuthProvider({
      sessionTtlMs: 1000,
      now: () => new Date(ms),
    });
    const { token } = await provider.issueSession(createId("acct"));
    ms += 1500;
    expect(await provider.verifySession(token)).toBeNull();
  });
});

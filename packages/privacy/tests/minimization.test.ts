import { describe, it, expect } from "vitest";

import {
  FORBIDDEN_TELEMETRY_KEYS,
  hashUserId,
  isConsentRequired,
  pickFields,
  redactKeys,
  redactTelemetry,
  sanitizeTelemetry,
} from "../src/index";

describe("data minimization", () => {
  it("redactKeys replaces listed keys without mutating input", () => {
    const input = { name: "Ada Example", email: "ada@example.com", age: 30 };
    const out = redactKeys(input, ["email"]);
    expect(out.email).toBe("[redacted]");
    expect(out.name).toBe("Ada Example");
    expect(input.email).toBe("ada@example.com");
  });

  it("pickFields keeps only allow-listed keys", () => {
    const input = { a: 1, b: 2, c: 3 };
    const out = pickFields(input, ["a", "c"]);
    expect(out).toEqual({ a: 1, c: 3 });
  });

  it("hashUserId is stable and opaque", () => {
    const a = hashUserId("user_example");
    const b = hashUserId("user_example");
    expect(a).toBe(b);
    expect(a).not.toContain("user_example");
    expect(a.startsWith("u_")).toBe(true);
  });

  it("redactTelemetry replaces userId with an opaque tag", () => {
    const out = redactTelemetry({ userId: "user_example", feature: "recs" });
    expect("userId" in out).toBe(false);
    expect(out.userTag?.startsWith("u_")).toBe(true);
    expect(out.feature).toBe("recs");
  });

  it("isConsentRequired hook returns a ConsentDecision", () => {
    expect(isConsentRequired("recs", "").required).toBe(false);
    expect(isConsentRequired("recs", "example-region").required).toBe(true);
  });
});

describe("sanitizeTelemetry", () => {
  it("strips raw content keys recursively", () => {
    const payload = {
      requestId: "req_1",
      prompt: "secret prompt",
      content: "secret content",
      body: "secret body",
      text: "secret text",
      nested: { text: "nested secret", keep: "ok" },
      list: [{ content: "drop me", score: 1 }],
    };
    const out = sanitizeTelemetry(payload) as Record<string, unknown>;
    for (const key of FORBIDDEN_TELEMETRY_KEYS) {
      expect(key in out).toBe(false);
    }
    expect(out.requestId).toBe("req_1");
    expect((out.nested as Record<string, unknown>).keep).toBe("ok");
    expect((out.nested as Record<string, unknown>).text).toBeUndefined();
    const list = out.list as Array<Record<string, unknown>>;
    expect(list[0]?.content).toBeUndefined();
    expect(list[0]?.score).toBe(1);
  });
});

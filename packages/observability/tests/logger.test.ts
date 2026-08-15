import { describe, it, expect } from "vitest";
import { InMemoryLogger, redactFields } from "../src/index";

describe("logger redaction", () => {
  it("strips forbidden keys from fields", () => {
    const logger = new InMemoryLogger();
    logger.info("user signed in", {
      accountId: "acct_1",
      email: "sam.placeholder@example.com",
      authToken: "should-not-appear",
      promptText: "secret prompt",
      body: "raw body",
      safe: "kept",
    });

    const record = logger.records[0];
    expect(record?.fields?.accountId).toBe("acct_1");
    expect(record?.fields?.safe).toBe("kept");
    expect(record?.fields?.email).toBe("[redacted]");
    expect(record?.fields?.authToken).toBe("[redacted]");
    expect(record?.fields?.promptText).toBe("[redacted]");
    expect(record?.fields?.body).toBe("[redacted]");
  });

  it("redactFields is case-insensitive and substring-based", () => {
    const out = redactFields({ UserEmail: "x", Password: "y", ok: "z" });
    expect(out?.UserEmail).toBe("[redacted]");
    expect(out?.Password).toBe("[redacted]");
    expect(out?.ok).toBe("z");
  });

  it("redacts forbidden keys recursively through nested objects and arrays", () => {
    const out = redactFields({
      request: { authorization: "Bearer raw", path: "/ok" },
      items: [{ email: "nested@example.org", keep: 1 }, "plain"],
      metadata: { prompt: "raw prompt", note: "kept" },
    });
    const request = out?.request as Record<string, unknown>;
    expect(request.authorization).toBe("[redacted]");
    expect(request.path).toBe("/ok");
    const items = out?.items as unknown[];
    expect((items[0] as Record<string, unknown>).email).toBe("[redacted]");
    expect((items[0] as Record<string, unknown>).keep).toBe(1);
    expect(items[1]).toBe("plain");
    const metadata = out?.metadata as Record<string, unknown>;
    expect(metadata.prompt).toBe("[redacted]");
    expect(metadata.note).toBe("kept");
  });

  it("records levels and messages", () => {
    const logger = new InMemoryLogger();
    logger.debug("d");
    logger.warn("w");
    logger.error("e");
    expect(logger.records.map((r) => r.level)).toEqual([
      "debug",
      "warn",
      "error",
    ]);
  });
});

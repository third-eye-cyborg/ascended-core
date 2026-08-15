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

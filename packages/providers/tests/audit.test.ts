import { describe, it, expect } from "vitest";
import { createId } from "@third-eye-cyborg/ascended-core";
import { InMemoryAuditLog } from "../src/index";

describe("InMemoryAuditLog", () => {
  it("records events with an id and timestamp", async () => {
    const log = new InMemoryAuditLog();
    const record = await log.record({
      action: "session.issued",
      actorId: createId("acct"),
      target: "document:doc_123",
    });

    expect(record.id).toBeDefined();
    expect(record.recordedAt).toBeDefined();
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]?.action).toBe("session.issued");
  });
});

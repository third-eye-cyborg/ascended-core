import { describe, it, expect } from "vitest";
import { createId } from "@ascended/core";
import { InMemorySearchIndex } from "../src/index";

describe("InMemorySearchIndex", () => {
  it("matches tokens and ranks by score", async () => {
    const index = new InMemorySearchIndex();
    const a = createId("doc");
    const b = createId("doc");
    await index.index({ id: a, text: "the quick brown fox" });
    await index.index({ id: b, text: "quick fox jumps" });

    const hits = await index.query("quick fox");
    expect(hits).toHaveLength(2);
    // both match two tokens; ensure ordering is deterministic by score
    expect(hits[0]?.score).toBe(2);
    expect(hits.map((h) => h.id).sort()).toEqual([a, b].sort());
  });

  it("removes documents", async () => {
    const index = new InMemorySearchIndex();
    const id = createId("doc");
    await index.index({ id, text: "hello world" });
    expect(await index.query("hello")).toHaveLength(1);
    await index.remove(id);
    expect(await index.query("hello")).toHaveLength(0);
  });

  it("returns nothing for an empty query", async () => {
    const index = new InMemorySearchIndex();
    await index.index({ id: createId("doc"), text: "anything" });
    expect(await index.query("   ")).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { createId, type EntityId, type IsoTimestamp } from "@ascended/core";
import { InMemoryRepository } from "../src/index";

interface Note {
  id: EntityId;
  body: string;
}

describe("InMemoryRepository cursor pagination", () => {
  it("paginates stably even when timestamps collide", async () => {
    // Same createdAt for every insert forces the seq tiebreaker to be used.
    const repo = new InMemoryRepository<Note>({
      now: () => "2026-01-01T00:00:00.000Z" as IsoTimestamp,
    });
    const ids: EntityId[] = [];
    for (let i = 0; i < 5; i++) {
      const id = createId("note");
      ids.push(id);
      await repo.create({ id, body: `note ${i}` });
    }

    const first = await repo.findMany(undefined, { limit: 2 });
    expect(first.items.map((n) => n.id)).toEqual([ids[0], ids[1]]);
    expect(first.nextCursor).toBeDefined();

    const second = await repo.findMany(undefined, {
      limit: 2,
      cursor: first.nextCursor,
    });
    expect(second.items.map((n) => n.id)).toEqual([ids[2], ids[3]]);

    const third = await repo.findMany(undefined, {
      limit: 2,
      cursor: second.nextCursor,
    });
    expect(third.items.map((n) => n.id)).toEqual([ids[4]]);
    expect(third.nextCursor).toBeUndefined();
  });

  it("throws on an unknown cursor", async () => {
    const repo = new InMemoryRepository<Note>();
    await expect(
      repo.findMany(undefined, { limit: 1, cursor: "bogus" }),
    ).rejects.toThrow();
  });
});

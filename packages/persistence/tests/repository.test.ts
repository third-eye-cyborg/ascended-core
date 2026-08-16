import { describe, it, expect } from "vitest";
import { createId, type EntityId, type IsoTimestamp } from "@third-eye-cyborg/ascended-core";
import { InMemoryRepository } from "../src/index";

interface Widget {
  id: EntityId;
  name: string;
  color: string;
}

function makeRepo(): InMemoryRepository<Widget> {
  // Deterministic clock so createdAt ordering is stable across inserts.
  let tick = 0;
  return new InMemoryRepository<Widget>({
    now: () => `2026-01-01T00:00:0${tick++}.000Z` as IsoTimestamp,
  });
}

describe("InMemoryRepository CRUD", () => {
  it("creates and reads entities", async () => {
    const repo = makeRepo();
    const id = createId("wid");
    await repo.create({ id, name: "Ada", color: "blue" });
    const found = await repo.findById(id);
    expect(found?.name).toBe("Ada");
  });

  it("rejects duplicate ids", async () => {
    const repo = makeRepo();
    const id = createId("wid");
    await repo.create({ id, name: "Ada", color: "blue" });
    await expect(
      repo.create({ id, name: "Sam", color: "red" }),
    ).rejects.toThrow();
  });

  it("updates without allowing id changes", async () => {
    const repo = makeRepo();
    const id = createId("wid");
    await repo.create({ id, name: "Ada", color: "blue" });
    const updated = await repo.update(id, {
      color: "green",
      id: createId("wid"),
    });
    expect(updated.color).toBe("green");
    expect(updated.id).toBe(id);
  });

  it("deletes entities", async () => {
    const repo = makeRepo();
    const id = createId("wid");
    await repo.create({ id, name: "Ada", color: "blue" });
    await repo.delete(id);
    expect(await repo.findById(id)).toBeNull();
  });

  it("returns copies so external mutation does not leak in", async () => {
    const repo = makeRepo();
    const id = createId("wid");
    await repo.create({ id, name: "Ada", color: "blue" });
    const found = await repo.findById(id);
    if (found) found.name = "mutated";
    expect((await repo.findById(id))?.name).toBe("Ada");
  });

  it("filters by field", async () => {
    const repo = makeRepo();
    await repo.create({ id: createId("wid"), name: "Ada", color: "blue" });
    await repo.create({ id: createId("wid"), name: "Sam", color: "red" });
    const page = await repo.findMany({ color: "red" });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.name).toBe("Sam");
  });
});

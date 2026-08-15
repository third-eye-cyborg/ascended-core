import { describe, it, expect } from "vitest";
import { createId, type EntityId } from "@ascended/core";
import { InMemoryRepository, InMemoryUnitOfWork } from "../src/index";

interface Account {
  id: EntityId;
  balance: number;
}

describe("InMemoryUnitOfWork", () => {
  it("commits changes when the callback resolves", async () => {
    const repo = new InMemoryRepository<Account>();
    const uow = new InMemoryUnitOfWork([repo]);
    const id = createId("acct");

    await uow.runInTransaction(async () => {
      await repo.create({ id, balance: 100 });
    });

    expect((await repo.findById(id))?.balance).toBe(100);
  });

  it("rolls back all changes when the callback throws", async () => {
    const repo = new InMemoryRepository<Account>();
    const uow = new InMemoryUnitOfWork([repo]);
    const existing = createId("acct");
    await repo.create({ id: existing, balance: 50 });

    await expect(
      uow.runInTransaction(async () => {
        await repo.update(existing, { balance: 999 });
        await repo.create({ id: createId("acct"), balance: 1 });
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    // Original state restored: balance unchanged and no new rows.
    expect((await repo.findById(existing))?.balance).toBe(50);
    const page = await repo.findMany();
    expect(page.items).toHaveLength(1);
  });
});

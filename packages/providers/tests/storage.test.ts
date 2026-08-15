import { describe, it, expect } from "vitest";
import { InMemoryObjectStorage } from "../src/index";

describe("InMemoryObjectStorage", () => {
  it("stores, reports existence, produces a url, and deletes", async () => {
    const storage = new InMemoryObjectStorage();
    const bytes = new Uint8Array([1, 2, 3]);

    expect(await storage.exists("a/b.txt")).toBe(false);
    await storage.put("a/b.txt", bytes, "text/plain");
    expect(await storage.exists("a/b.txt")).toBe(true);

    const url = await storage.getUrl("a/b.txt");
    expect(url).toContain("memory://objects");

    expect(storage.read("a/b.txt")?.contentType).toBe("text/plain");

    await storage.delete("a/b.txt");
    expect(await storage.exists("a/b.txt")).toBe(false);
  });

  it("copies bytes defensively on put", async () => {
    const storage = new InMemoryObjectStorage();
    const bytes = new Uint8Array([9]);
    await storage.put("k", bytes, "application/octet-stream");
    bytes[0] = 0;
    expect(storage.read("k")?.bytes[0]).toBe(9);
  });
});

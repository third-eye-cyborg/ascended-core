import { describe, it, expect } from "vitest";
import {
  createRequestScope,
  withRequestScope,
  getRequestScope,
} from "../src/index";

describe("request scope propagation", () => {
  it("propagates the scope across awaits", async () => {
    const scope = createRequestScope({ userIdTag: "surrogate-1" });

    const result = await withRequestScope(scope, async () => {
      await Promise.resolve();
      await delay(1);
      return getRequestScope();
    });

    expect(result?.requestId).toBe(scope.requestId);
    expect(result?.userIdTag).toBe("surrogate-1");
  });

  it("isolates concurrent scopes", async () => {
    const a = createRequestScope();
    const b = createRequestScope();

    const [ra, rb] = await Promise.all([
      withRequestScope(a, async () => {
        await delay(2);
        return getRequestScope()?.requestId;
      }),
      withRequestScope(b, async () => {
        await delay(1);
        return getRequestScope()?.requestId;
      }),
    ]);

    expect(ra).toBe(a.requestId);
    expect(rb).toBe(b.requestId);
  });

  it("has no ambient scope outside a run", () => {
    expect(getRequestScope()).toBeUndefined();
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

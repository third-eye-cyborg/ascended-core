import { describe, it, expect } from "vitest";
import { FixedWindowRateLimiter } from "../src/index";

describe("FixedWindowRateLimiter", () => {
  it("allows up to the limit then denies with retryAfter", async () => {
    let ms = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 2,
      windowMs: 1000,
      now: () => new Date(ms),
    });

    expect((await limiter.consume("k")).allowed).toBe(true);
    const second = await limiter.consume("k");
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);

    const third = await limiter.consume("k");
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets when the window rolls over", async () => {
    let ms = 0;
    const limiter = new FixedWindowRateLimiter({
      limit: 1,
      windowMs: 1000,
      now: () => new Date(ms),
    });
    expect((await limiter.consume("k")).allowed).toBe(true);
    expect((await limiter.consume("k")).allowed).toBe(false);
    ms = 1000;
    expect((await limiter.consume("k")).allowed).toBe(true);
  });

  it("respects cost per consume", async () => {
    const limiter = new FixedWindowRateLimiter({
      limit: 5,
      windowMs: 1000,
      now: () => new Date(0),
    });
    const decision = await limiter.consume("k", 5);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(0);
    expect((await limiter.consume("k", 1)).allowed).toBe(false);
  });
});

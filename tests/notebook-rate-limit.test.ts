import { describe, expect, it } from "vitest";

import { createInMemoryUnlockRateLimiter, getUnlockRateLimiter, UnlockRateLimitError } from "../src/lib/notebooks/rate-limit";

describe("unlock rate limiter", () => {
  it("blocks repeated failures by IP and slug with retry window", () => {
    let clock = new Date("2026-04-15T00:00:00.000Z").getTime();
    const now = () => new Date(clock);

    const limiter = createInMemoryUnlockRateLimiter({
      maxFailures: 3,
      lockoutMs: 60_000,
      windowMs: 10 * 60_000,
      now,
    });

    const key = { ip: "127.0.0.1", slug: "project-notes" };

    limiter.assertAllowed(key);
    limiter.registerFailure(key);
    limiter.registerFailure(key);
    limiter.registerFailure(key);

    expect(() => limiter.assertAllowed(key)).toThrowError(UnlockRateLimitError);

    clock += 61_000;
    expect(() => limiter.assertAllowed(key)).not.toThrow();
  });

  it("clears counters after successful unlock reset", () => {
    const limiter = createInMemoryUnlockRateLimiter({ maxFailures: 2, lockoutMs: 120_000 });
    const key = { ip: "10.0.0.1", slug: "project-notes" };

    limiter.registerFailure(key);
    limiter.registerFailure(key);
    expect(() => limiter.assertAllowed(key)).toThrowError(UnlockRateLimitError);

    limiter.reset(key);
    expect(() => limiter.assertAllowed(key)).not.toThrow();
  });

  it("returns a shared limiter instance for route-level persistence", () => {
    const first = getUnlockRateLimiter();
    const second = getUnlockRateLimiter();

    expect(first).toBe(second);
  });
});

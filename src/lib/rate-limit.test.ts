import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit within the window", () => {
    const key = `test-${Math.random()}`;
    const now = 1000;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, 3, 60_000, now).allowed).toBe(true);
    }
  });

  it("blocks once the limit is exceeded within the window", () => {
    const key = `test-${Math.random()}`;
    const now = 1000;
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000, now);
    const result = checkRateLimit(key, 3, 60_000, now);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets once the window has elapsed", () => {
    const key = `test-${Math.random()}`;
    const start = 1000;
    for (let i = 0; i < 3; i++) checkRateLimit(key, 3, 60_000, start);
    const afterWindow = start + 60_001;
    expect(checkRateLimit(key, 3, 60_000, afterWindow).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    const now = 1000;
    checkRateLimit(keyA, 1, 60_000, now);
    expect(checkRateLimit(keyB, 1, 60_000, now).allowed).toBe(true);
  });
});

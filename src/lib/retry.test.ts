import { describe, it, expect, vi } from "vitest";
import { retryOnTransientNetworkError } from "./retry";

function fetchFailedError() {
  return new TypeError("fetch failed");
}

describe("retryOnTransientNetworkError", () => {
  it("returns the result on first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryOnTransientNetworkError(fn, 3, 1);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on a transient 'fetch failed' error and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(fetchFailedError())
      .mockRejectedValueOnce(fetchFailedError())
      .mockResolvedValueOnce("ok");
    const result = await retryOnTransientNetworkError(fn, 3, 1);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(fetchFailedError());
    await expect(retryOnTransientNetworkError(fn, 3, 1)).rejects.toThrow("fetch failed");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-network error (e.g. a real SQL/constraint error)", async () => {
    const sqlError = new Error("duplicate key value violates unique constraint");
    const fn = vi.fn().mockRejectedValue(sqlError);
    await expect(retryOnTransientNetworkError(fn, 3, 1)).rejects.toThrow(
      "duplicate key value violates unique constraint"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a TypeError whose message isn't a fetch failure", async () => {
    const fn = vi.fn().mockRejectedValue(new TypeError("Cannot read properties of undefined"));
    await expect(retryOnTransientNetworkError(fn, 3, 1)).rejects.toThrow(
      "Cannot read properties of undefined"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

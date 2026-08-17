import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-32-bytes-long!!";
});

describe("session", () => {
  it("round-trips a payload through sign and verify", async () => {
    const token = await signSession({ participantId: "abc-123" }, "10m");
    const payload = await verifySession<{ participantId: string }>(token);
    expect(payload?.participantId).toBe("abc-123");
  });

  it("returns null for a tampered token", async () => {
    const token = await signSession({ participantId: "abc-123" }, "10m");
    const tampered = token.slice(0, -2) + "xx";
    const payload = await verifySession(tampered);
    expect(payload).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const token = await signSession({ participantId: "abc-123" }, "-1s");
    const payload = await verifySession(token);
    expect(payload).toBeNull();
  });

  it("returns null for garbage input", async () => {
    const payload = await verifySession("not-a-jwt");
    expect(payload).toBeNull();
  });
});

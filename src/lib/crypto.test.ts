import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "crypto";
import { encryptSecret, decryptSecret, maskSecret } from "./crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const secret = "AIzaSyD-fake-gemini-key-1234567890";
    const encrypted = encryptSecret(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it("produces ciphertext that does not contain the plaintext", () => {
    const secret = "AIzaSyD-fake-gemini-key-1234567890";
    expect(encryptSecret(secret)).not.toContain(secret);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const secret = "same-secret";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  it("throws when ciphertext has been tampered with", () => {
    const encrypted = encryptSecret("some-secret");
    const tampered = encrypted.slice(0, -4) + "abcd";
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    const original = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow(/ENCRYPTION_KEY/);
    process.env.ENCRYPTION_KEY = original;
  });
});

describe("maskSecret", () => {
  it("shows only the last 4 characters", () => {
    expect(maskSecret("AIzaSyD1234567890")).toBe("••••7890");
  });

  it("fully masks very short values", () => {
    expect(maskSecret("ab")).toBe("••••");
  });
});

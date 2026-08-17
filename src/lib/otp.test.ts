import { describe, it, expect } from "vitest";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiryDate,
  isOtpExpired,
  hasExceededAttempts,
  isGmailAddress,
  otpResendCooldownRemaining,
  OTP_CONFIG,
} from "./otp";

describe("generateOtp", () => {
  it("generates a 6-digit numeric code", () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes across calls (statistically)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("hashOtp / verifyOtp", () => {
  it("verifies a matching code against its hash", async () => {
    const code = "482913";
    const hash = await hashOtp(code);
    await expect(verifyOtp(code, hash)).resolves.toBe(true);
  });

  it("rejects a non-matching code", async () => {
    const hash = await hashOtp("482913");
    await expect(verifyOtp("000000", hash)).resolves.toBe(false);
  });
});

describe("otpExpiryDate / isOtpExpired", () => {
  it("marks a freshly issued OTP as not expired", () => {
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    const expiresAt = otpExpiryDate(issuedAt);
    expect(isOtpExpired(expiresAt, issuedAt)).toBe(false);
  });

  it("marks an OTP as expired after the TTL window", () => {
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    const expiresAt = otpExpiryDate(issuedAt);
    const later = new Date(
      expiresAt.getTime() + (OTP_CONFIG.OTP_TTL_MINUTES + 1) * 60 * 1000
    );
    expect(isOtpExpired(expiresAt, later)).toBe(true);
  });

  it("treats the exact expiry instant as not yet expired", () => {
    const issuedAt = new Date("2026-01-01T00:00:00Z");
    const expiresAt = otpExpiryDate(issuedAt);
    expect(isOtpExpired(expiresAt, expiresAt)).toBe(false);
  });
});

describe("hasExceededAttempts", () => {
  it("allows attempts below the max", () => {
    expect(hasExceededAttempts(OTP_CONFIG.MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("blocks once attempts reach the max", () => {
    expect(hasExceededAttempts(OTP_CONFIG.MAX_ATTEMPTS)).toBe(true);
  });
});

describe("otpResendCooldownRemaining", () => {
  it("allows issuing immediately when no OTP has been sent before", () => {
    expect(otpResendCooldownRemaining(null)).toBe(0);
  });

  it("blocks issuing right after a code was sent", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(otpResendCooldownRemaining(now, now)).toBe(OTP_CONFIG.RESEND_COOLDOWN_SECONDS);
  });

  it("allows issuing again once the cooldown has fully elapsed", () => {
    const lastIssuedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date(
      lastIssuedAt.getTime() + OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000
    );
    expect(otpResendCooldownRemaining(lastIssuedAt, now)).toBe(0);
  });

  it("reports partial remaining time mid-cooldown", () => {
    const lastIssuedAt = new Date("2026-01-01T00:00:00Z");
    const now = new Date(lastIssuedAt.getTime() + 10 * 1000);
    expect(otpResendCooldownRemaining(lastIssuedAt, now)).toBe(
      OTP_CONFIG.RESEND_COOLDOWN_SECONDS - 10
    );
  });
});

describe("isGmailAddress", () => {
  it("accepts a valid gmail address", () => {
    expect(isGmailAddress("builder@gmail.com")).toBe(true);
  });

  it("accepts gmail with mixed case domain", () => {
    expect(isGmailAddress("builder@Gmail.com")).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    expect(isGmailAddress("  builder@gmail.com  ")).toBe(true);
  });

  it("rejects non-gmail domains", () => {
    expect(isGmailAddress("builder@yahoo.com")).toBe(false);
  });

  it("rejects malformed addresses", () => {
    expect(isGmailAddress("not-an-email")).toBe(false);
  });
});

import bcrypt from "bcryptjs";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;

export function generateOtp(): string {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  const n = Math.floor(Math.random() * (max - min + 1)) + min;
  return n.toString();
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

export function otpExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function isOtpExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() > expiresAt.getTime();
}

export function hasExceededAttempts(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

/** Seconds remaining before another OTP may be issued, or 0 if allowed now. */
export function otpResendCooldownRemaining(
  lastIssuedAt: Date | null,
  now: Date = new Date()
): number {
  if (!lastIssuedAt) return 0;
  const elapsedSeconds = (now.getTime() - lastIssuedAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds));
}

export function isGmailAddress(email: string): boolean {
  return /^[^\s@]+@gmail\.com$/i.test(email.trim());
}

export const OTP_CONFIG = {
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_SECONDS,
};

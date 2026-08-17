import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { signSession, verifySession } from "./session";

const PARTICIPANT_COOKIE = "vv_session";
const ADMIN_COOKIE = "vv_admin_session";

const PARTICIPANT_TTL = "30d";
const ADMIN_TTL = "7d";
const REPORT_TOKEN_TTL = "90d";

export async function createParticipantSession(participantId: string) {
  const token = await signSession({ participantId }, PARTICIPANT_TTL);
  const store = await cookies();
  store.set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCurrentParticipantId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession<{ participantId: string }>(token);
  return payload?.participantId ?? null;
}

export async function clearParticipantSession() {
  const store = await cookies();
  store.delete(PARTICIPANT_COOKIE);
}

/**
 * A long-lived, URL-carryable token that grants read access to one
 * participant's own report — used so an emailed report link works on a
 * device/browser that never had the onboarding session cookie.
 */
export async function signReportAccessToken(participantId: string): Promise<string> {
  return signSession({ participantId, purpose: "report" }, REPORT_TOKEN_TTL);
}

async function verifyReportAccessToken(token: string): Promise<string | null> {
  const payload = await verifySession<{ participantId: string; purpose: string }>(token);
  if (!payload || payload.purpose !== "report") return null;
  return payload.participantId;
}

/**
 * Resolves the acting participant from the session cookie, falling back to
 * a `?token=` report-access token when there's no cookie (e.g. the emailed
 * report link opened on a different device).
 */
export async function resolveParticipantId(req: NextRequest): Promise<string | null> {
  const fromCookie = await getCurrentParticipantId();
  if (fromCookie) return fromCookie;

  const token = req.nextUrl.searchParams.get("token");
  if (!token) return null;
  return verifyReportAccessToken(token);
}

export async function createAdminSession(adminId: string, email: string) {
  const token = await signSession({ adminId, email }, ADMIN_TTL);
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getCurrentAdmin(): Promise<{ adminId: string; email: string } | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession<{ adminId: string; email: string }>(token);
  if (!payload) return null;
  return { adminId: payload.adminId, email: payload.email };
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

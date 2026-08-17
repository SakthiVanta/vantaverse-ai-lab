import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { signSession, verifySession } from "./session";

const PARTICIPANT_COOKIE = "vv_session";
const ADMIN_COOKIE = "vv_admin_session";

const PARTICIPANT_TTL = "30d";
const ADMIN_TTL = "7d";

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

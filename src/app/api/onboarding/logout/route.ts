import { NextResponse } from "next/server";
import { clearParticipantSession } from "@/lib/auth";

export async function POST() {
  await clearParticipantSession();
  return NextResponse.json({ ok: true });
}

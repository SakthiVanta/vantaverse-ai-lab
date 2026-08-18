import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getVerifiedParticipantId } from "@/lib/auth";

export async function POST() {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.participantId, participantId), isNull(notifications.readAt)));

  return NextResponse.json({ ok: true });
}

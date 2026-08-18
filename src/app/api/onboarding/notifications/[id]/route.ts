import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getVerifiedParticipantId } from "@/lib/auth";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const { id } = await params;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.participantId, participantId)));

  return NextResponse.json({ ok: true });
}

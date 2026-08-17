import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentParticipantId } from "@/lib/auth";
import { getSpiritById } from "@/lib/spirits";
import { logEvent } from "@/lib/events";

const bodySchema = z.object({ spiritId: z.string() });

export async function POST(req: NextRequest) {
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !getSpiritById(parsed.data.spiritId)) {
    return NextResponse.json({ error: "Invalid spirit" }, { status: 400 });
  }

  await db
    .update(participants)
    .set({
      spiritId: parsed.data.spiritId,
      spiritSelectedAt: new Date(),
      status: "onboarding_in_progress",
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId));

  await logEvent(participantId, "spirit_selected", { spiritId: parsed.data.spiritId });

  return NextResponse.json({ ok: true });
}

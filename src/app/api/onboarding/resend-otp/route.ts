import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { issueOtp } from "@/lib/otp-issuance";
import { getCurrentParticipantId } from "@/lib/auth";

export async function POST() {
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired. Start again." }, { status: 401 });
  }

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
  });
  if (!participant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (participant.emailVerified) {
    return NextResponse.json({ verified: true });
  }

  const result = await issueOtp(participantId, participant.email, participant.name);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ sent: true });
}

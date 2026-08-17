import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isGmailAddress } from "@/lib/otp";
import { issueOtp } from "@/lib/otp-issuance";
import { createParticipantSession } from "@/lib/auth";
import { logEvent } from "@/lib/events";

const bodySchema = z.object({
  name: z.string().trim().min(1, "First name is required").max(80),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .refine(isGmailAddress, "Only Gmail addresses are accepted for Cohort 01"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, email } = parsed.data;

  let participant = await db.query.participants.findFirst({
    where: eq(participants.email, email),
  });

  if (!participant) {
    const [created] = await db
      .insert(participants)
      .values({ name, email, status: "identity_pending", startedAt: new Date() })
      .returning();
    participant = created;
    await logEvent(participant.id, "started");
  } else if (participant.name !== name) {
    await db
      .update(participants)
      .set({ name, updatedAt: new Date() })
      .where(eq(participants.id, participant.id));
  }

  await createParticipantSession(participant.id);

  if (!participant.emailVerified) {
    const result = await issueOtp(participant.id, email, name);
    if (!result.ok) {
      // A resend-cooldown hit here just means they already have a live code
      // in their inbox from a moment ago — let them proceed to enter it.
      if (result.status !== 429) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
    }
  }

  return NextResponse.json({
    emailVerified: participant.emailVerified,
  });
}

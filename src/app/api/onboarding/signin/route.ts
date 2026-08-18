import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isGmailAddress } from "@/lib/otp";
import { issueOtp } from "@/lib/otp-issuance";
import { createParticipantSession } from "@/lib/auth";

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .refine(isGmailAddress, "Only Gmail addresses are accepted for Cohort 01"),
});

/** Sign-in for a returning builder — email only, no name field, and never
 * silently renames or creates an account (that's /api/onboarding/start). */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { email } = parsed.data;

  const participant = await db.query.participants.findFirst({
    where: eq(participants.email, email),
  });

  if (!participant) {
    return NextResponse.json(
      { error: "No Vantaverse account found for that email — create one first.", notFound: true },
      { status: 404 }
    );
  }

  await createParticipantSession(participant.id);

  if (!participant.emailVerified) {
    const result = await issueOtp(participant.id, email, participant.name);
    if (!result.ok && result.status !== 429) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
  }

  return NextResponse.json({ emailVerified: participant.emailVerified });
}

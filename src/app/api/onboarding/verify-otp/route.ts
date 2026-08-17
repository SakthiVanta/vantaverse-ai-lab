import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { otpCodes, participants } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { verifyOtp, isOtpExpired, hasExceededAttempts } from "@/lib/otp";
import { getCurrentParticipantId } from "@/lib/auth";
import { logEvent } from "@/lib/events";

const bodySchema = z.object({ code: z.string().trim().length(6) });

export async function POST(req: NextRequest) {
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired. Start again." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }

  const otp = await db.query.otpCodes.findFirst({
    where: and(
      eq(otpCodes.participantId, participantId),
      isNull(otpCodes.consumedAt)
    ),
    orderBy: desc(otpCodes.createdAt),
  });

  if (!otp) {
    return NextResponse.json(
      { error: "No active code. Request a new one." },
      { status: 400 }
    );
  }

  if (hasExceededAttempts(otp.attempts)) {
    return NextResponse.json(
      { error: "Too many attempts. Request a new code." },
      { status: 429 }
    );
  }

  if (isOtpExpired(otp.expiresAt)) {
    return NextResponse.json(
      { error: "That code expired. Request a new one." },
      { status: 400 }
    );
  }

  const valid = await verifyOtp(parsed.data.code, otp.codeHash);

  if (!valid) {
    await db
      .update(otpCodes)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(otpCodes.id, otp.id));
    return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, otp.id));
  await db
    .update(participants)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: "identity_verified",
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId));

  await logEvent(participantId, "identity_verified");

  return NextResponse.json({ verified: true });
}

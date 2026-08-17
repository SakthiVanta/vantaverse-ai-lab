import { NextResponse } from "next/server";
import { db } from "@/db";
import { otpCodes, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { getCurrentParticipantId } from "@/lib/auth";
import { logEvent } from "@/lib/events";

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

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  await db.insert(otpCodes).values({
    participantId,
    codeHash,
    expiresAt: otpExpiryDate(),
  });

  try {
    await sendOtpEmail(participant.email, participant.name, code);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("Failed to resend OTP email", err);
      return NextResponse.json({ error: "Could not send email" }, { status: 502 });
    }
    console.warn(`[dev] SMTP not configured — OTP for ${participant.email} is: ${code}`);
  }

  await logEvent(participantId, "otp_resent");
  return NextResponse.json({ sent: true });
}

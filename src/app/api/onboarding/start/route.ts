import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { participants, otpCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateOtp, hashOtp, otpExpiryDate, isGmailAddress } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
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
    const code = generateOtp();
    const codeHash = await hashOtp(code);
    await db.insert(otpCodes).values({
      participantId: participant.id,
      codeHash,
      expiresAt: otpExpiryDate(),
    });

    try {
      await sendOtpEmail(email, name, code);
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        console.error("Failed to send OTP email", err);
        return NextResponse.json(
          { error: "Could not send verification email. Try again shortly." },
          { status: 502 }
        );
      }
      console.warn(
        `[dev] SMTP not configured — OTP for ${email} is: ${code}`
      );
    }

    await logEvent(participant.id, "otp_requested");
  }

  return NextResponse.json({
    emailVerified: participant.emailVerified,
  });
}

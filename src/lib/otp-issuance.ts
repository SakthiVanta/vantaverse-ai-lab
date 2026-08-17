import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateOtp, hashOtp, otpExpiryDate, otpResendCooldownRemaining } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";

export type IssueOtpResult = { ok: true } | { ok: false; error: string; status: number };

/** Generates and emails a fresh OTP, enforcing a cooldown against email-bombing. */
export async function issueOtp(
  participantId: string,
  email: string,
  name: string
): Promise<IssueOtpResult> {
  const lastOtp = await db.query.otpCodes.findFirst({
    where: eq(otpCodes.participantId, participantId),
    orderBy: desc(otpCodes.createdAt),
  });

  const remaining = otpResendCooldownRemaining(lastOtp?.createdAt ?? null);
  if (remaining > 0) {
    return {
      ok: false,
      error: `Please wait ${remaining}s before requesting another code`,
      status: 429,
    };
  }

  const code = generateOtp();
  const codeHash = await hashOtp(code);
  await db.insert(otpCodes).values({
    participantId,
    codeHash,
    expiresAt: otpExpiryDate(),
  });

  try {
    await sendOtpEmail(email, name, code);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("Failed to send OTP email", err);
      return {
        ok: false,
        error: "Could not send verification email. Try again shortly.",
        status: 502,
      };
    }
    console.warn(`[dev] SMTP not configured — OTP for ${email} is: ${code}`);
  }

  await logEvent(participantId, "otp_requested");
  return { ok: true };
}

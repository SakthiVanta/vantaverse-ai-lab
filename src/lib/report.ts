import { db } from "@/db";
import { participants, aiAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendBuilderReportEmail } from "@/lib/email";
import { signReportAccessToken } from "@/lib/auth";
import { logEvent } from "@/lib/events";

/** The one-line summary shown in the Builder Report email. */
export function buildReportSummary(input: {
  githubSummary?: string | null;
  strengthSignals: string[];
}): string {
  return input.githubSummary?.trim() || input.strengthSignals[0] || "";
}

/** A lightweight "first Vantaverse direction" line derived from the analysis. */
export function buildFirstDirection(input: {
  interests: string[];
  primaryArchetype: string;
}): string {
  const topInterest = input.interests[0];
  if (!topInterest) {
    return `Keep building — your next challenge will sharpen what makes you ${input.primaryArchetype}.`;
  }
  return `Start close to ${topInterest} — it's where your signals are already pointing, and it's the fastest path to your next Vantaverse challenge.`;
}

/** Emails the Builder Report for a participant who already has a saved
 * analysis. Shared by the admin "Send Report" action and the automatic
 * email sent after an admin runs analysis with the fallback key. */
export async function sendBuilderReportForParticipant(participantId: string): Promise<void> {
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
  });
  const analysis = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.participantId, participantId),
  });

  if (!participant || !analysis) {
    throw new Error("Run analysis first");
  }

  const token = await signReportAccessToken(participantId);
  await sendBuilderReportEmail(participant.email, participant.name, {
    archetype: analysis.primaryArchetype,
    summary: buildReportSummary({
      githubSummary: analysis.githubSummary,
      strengthSignals: analysis.strengthSignals as string[],
    }),
    cardImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/builder-card/${participantId}`,
    reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/complete?token=${token}`,
  });
  await logEvent(participantId, "report_emailed");
}

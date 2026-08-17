import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentParticipantId } from "@/lib/auth";
import { getParticipantOnboardingState } from "@/lib/participant-state";
import { runAndSaveAnalysis } from "@/lib/analysis";
import { sendBuilderReportEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";

export async function POST() {
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const state = await getParticipantOnboardingState();
  if (!state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!state.allChallengesComplete) {
    return NextResponse.json(
      { error: "Finish every challenge first", nextChallengeKey: state.nextChallengeKey },
      { status: 400 }
    );
  }

  await db
    .update(participants)
    .set({ status: "onboarding_completed", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(participants.id, participantId));
  await logEvent(participantId, "onboarding_completed");

  let analysisReady = false;
  try {
    const analysis = await runAndSaveAnalysis(participantId);
    analysisReady = true;

    try {
      await sendBuilderReportEmail(state.participant.email, state.participant.name, {
        archetype: analysis.builder_identity.primary_archetype,
        summary: analysis.github_summary || analysis.strength_signals[0] || "",
        reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/complete`,
      });
      await logEvent(participantId, "report_emailed");
    } catch (emailErr) {
      console.warn("Builder report email failed (non-fatal):", emailErr);
    }
  } catch (err) {
    console.warn("AI analysis failed (participant can be re-analyzed from admin):", err);
  }

  return NextResponse.json({ completed: true, analysisReady });
}

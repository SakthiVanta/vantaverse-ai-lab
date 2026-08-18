import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getVerifiedParticipantId, signReportAccessToken } from "@/lib/auth";
import { getParticipantOnboardingState } from "@/lib/participant-state";
import { runAndSaveAnalysis } from "@/lib/analysis";
import { getOwnKeyStatus } from "@/lib/ai-key";
import { sendBuilderReportEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { buildReportSummary } from "@/lib/report";

export async function POST() {
  const participantId = await getVerifiedParticipantId();
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

  // Analysis only runs automatically here if the builder has already added
  // their own AI key. Without one, it stays pending until either they add
  // a key and self-trigger it, or an admin runs it with the fallback key
  // (which emails them once it's ready) — no env key is ever spent on a
  // participant's behalf without one of those two explicit triggers.
  const { hasKey } = await getOwnKeyStatus(participantId);
  let analysisReady = false;

  if (hasKey) {
    try {
      const analysis = await runAndSaveAnalysis(participantId, "self");
      analysisReady = true;

      try {
        const token = await signReportAccessToken(participantId);
        await sendBuilderReportEmail(state.participant.email, state.participant.name, {
          archetype: analysis.builder_identity.primary_archetype,
          summary: buildReportSummary({
            githubSummary: analysis.github_summary,
            strengthSignals: analysis.strength_signals,
          }),
          cardImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/builder-card/${participantId}`,
          reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/complete?token=${token}`,
        });
        await logEvent(participantId, "report_emailed");
      } catch (emailErr) {
        console.warn("Builder report email failed (non-fatal):", emailErr);
      }
    } catch (err) {
      console.warn("AI analysis failed (participant can retry or admin can run it):", err);
    }
  }

  return NextResponse.json({ completed: true, analysisReady, hasOwnKey: hasKey });
}

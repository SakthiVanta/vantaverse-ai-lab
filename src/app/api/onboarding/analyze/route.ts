import { NextResponse } from "next/server";
import { getVerifiedParticipantId } from "@/lib/auth";
import { getParticipantOnboardingState } from "@/lib/participant-state";
import { runAndSaveAnalysis } from "@/lib/analysis";
import { sendBuilderReportForParticipant } from "@/lib/report";
import { MissingKeyError } from "@/lib/ai-key";
import { logEvent } from "@/lib/events";

/** Self-service (re-)analysis, only reachable once the builder has added
 * their own AI key — see /onboarding/complete and /onboarding/profile. */
export async function POST() {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const state = await getParticipantOnboardingState();
  if (!state || !state.allChallengesComplete) {
    return NextResponse.json({ error: "Finish onboarding first" }, { status: 400 });
  }

  try {
    await runAndSaveAnalysis(participantId, "self");
    try {
      await sendBuilderReportForParticipant(participantId);
      await logEvent(participantId, "report_emailed");
    } catch (emailErr) {
      console.warn("Builder report email failed (non-fatal):", emailErr);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

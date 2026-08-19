import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { participants, aiAnalyses, builderCards, problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveParticipantId } from "@/lib/auth";
import { buildFirstDirection } from "@/lib/report";

export async function GET(req: NextRequest) {
  const participantId = await resolveParticipantId(req);
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const analysis = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.participantId, participantId),
  });
  const [participant, card, problem] = await Promise.all([
    db.query.participants.findFirst({ where: eq(participants.id, participantId) }),
    db.query.builderCards.findFirst({ where: eq(builderCards.participantId, participantId) }),
    db.query.problems.findFirst({ where: eq(problems.participantId, participantId) }),
  ]);

  if (!analysis) {
    return NextResponse.json({ ready: false });
  }

  // True when GitHub was connected after this analysis ran (or the
  // connect timestamp is missing for a connected account) — the stored
  // github_summary was written before that connection existed, so it
  // wrongly reads as "no GitHub profile was connected."
  const githubStale =
    !!participant?.githubConnected &&
    (!participant.githubConnectedAt || participant.githubConnectedAt > analysis.createdAt);

  const githubSummary = githubStale
    ? "GitHub is now connected, but this report was generated before that — refresh your analysis to get a fresh read on your building history."
    : analysis.githubSummary;

  return NextResponse.json({
    ready: true,
    archetype: {
      primary: analysis.primaryArchetype,
      secondary: analysis.secondaryArchetype,
    },
    signals: analysis.signals,
    strengthSignals: analysis.strengthSignals,
    growthSignals: analysis.growthSignals,
    interests: analysis.interests,
    githubSummary,
    githubStale,
    evidence: analysis.evidence,
    confidence: analysis.confidence,
    generatedAt: analysis.createdAt.toISOString(),
    cardImageUrl: card?.imageUrl ?? null,
    problem: problem
      ? { description: problem.description, who: problem.whoExperiencesIt, why: problem.whyItMatters }
      : null,
    firstDirection: buildFirstDirection({
      interests: analysis.interests as string[],
      primaryArchetype: analysis.primaryArchetype,
    }),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiAnalyses, builderCards, problems } from "@/db/schema";
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
  const [card, problem] = await Promise.all([
    db.query.builderCards.findFirst({ where: eq(builderCards.participantId, participantId) }),
    db.query.problems.findFirst({ where: eq(problems.participantId, participantId) }),
  ]);

  if (!analysis) {
    return NextResponse.json({ ready: false });
  }

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
    githubSummary: analysis.githubSummary,
    evidence: analysis.evidence,
    confidence: analysis.confidence,
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

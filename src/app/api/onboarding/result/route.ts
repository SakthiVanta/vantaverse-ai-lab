import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiAnalyses, builderCards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentParticipantId } from "@/lib/auth";

export async function GET() {
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const analysis = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.participantId, participantId),
  });
  const card = await db.query.builderCards.findFirst({
    where: eq(builderCards.participantId, participantId),
  });

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
  });
}

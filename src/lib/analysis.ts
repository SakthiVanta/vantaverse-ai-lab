import { db } from "@/db";
import {
  participants,
  challengeResponses,
  problems,
  githubProfiles,
  aiAnalyses,
  builderCards,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { runBuilderAnalysis, type AnalysisInput } from "@/lib/gemini";

export async function buildAnalysisInput(participantId: string): Promise<AnalysisInput> {
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
  });
  if (!participant) throw new Error("Participant not found");

  const responses = await db.query.challengeResponses.findMany({
    where: eq(challengeResponses.participantId, participantId),
  });

  const problem = await db.query.problems.findFirst({
    where: eq(problems.participantId, participantId),
  });

  const github = await db.query.githubProfiles.findFirst({
    where: eq(githubProfiles.participantId, participantId),
  });

  return {
    name: participant.name,
    challengeResponses: responses.map((r) => ({
      challengeKey: r.challengeKey,
      response: r.response,
      reasoning: r.reasoning,
    })),
    problem: problem
      ? { description: problem.description, who: problem.whoExperiencesIt, why: problem.whyItMatters }
      : null,
    github: github
      ? {
          username: github.username,
          languageBreakdown: (github.languageBreakdown as Record<string, number>) ?? {},
          projectThemes: (github.projectThemes as string[]) ?? [],
          activitySignal: github.activitySignal ?? "Unknown",
          aiProjectEvidence: github.aiProjectEvidence ?? "Limited",
          repoCount: (github.repositories as unknown[])?.length ?? 0,
        }
      : null,
  };
}

export async function runAndSaveAnalysis(participantId: string) {
  const input = await buildAnalysisInput(participantId);
  const { analysis, model, raw } = await runBuilderAnalysis(input);

  const existing = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.participantId, participantId),
  });

  const values = {
    primaryArchetype: analysis.builder_identity.primary_archetype,
    secondaryArchetype: analysis.builder_identity.secondary_archetype ?? null,
    signals: analysis.signals,
    strengthSignals: analysis.strength_signals,
    growthSignals: analysis.growth_signals,
    interests: analysis.interests,
    githubSummary: analysis.github_summary ?? null,
    evidence: analysis.evidence,
    confidence: analysis.confidence,
    rawResponse: JSON.parse(raw),
    model,
  };

  if (existing) {
    await db.update(aiAnalyses).set(values).where(eq(aiAnalyses.id, existing.id));
  } else {
    await db.insert(aiAnalyses).values({ participantId, ...values });
  }

  const existingCard = await db.query.builderCards.findFirst({
    where: eq(builderCards.participantId, participantId),
  });
  if (!existingCard) {
    await db.insert(builderCards).values({
      participantId,
      imageUrl: `/api/builder-card/${participantId}`,
    });
  }

  await db
    .update(participants)
    .set({ status: "analysis_completed", updatedAt: new Date() })
    .where(eq(participants.id, participantId));

  return analysis;
}

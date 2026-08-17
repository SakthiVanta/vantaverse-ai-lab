import type { NextRequest } from "next/server";
import { db } from "@/db";
import { participants, challengeResponses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CHALLENGES } from "@/lib/challenges";
import { getCurrentParticipantId, resolveParticipantId } from "@/lib/auth";

export async function getParticipantOnboardingState(req?: NextRequest) {
  const participantId = req ? await resolveParticipantId(req) : await getCurrentParticipantId();
  if (!participantId) return null;

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
  });
  if (!participant) return null;

  const responses = await db.query.challengeResponses.findMany({
    where: eq(challengeResponses.participantId, participantId),
  });
  const completedKeys = new Set(responses.map((r) => r.challengeKey));
  const nextChallenge = CHALLENGES.find((c) => !completedKeys.has(c.key));

  return {
    participant,
    completedChallengeKeys: Array.from(completedKeys),
    nextChallengeKey: nextChallenge?.key ?? null,
    allChallengesComplete: !nextChallenge,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { challengeResponses, problems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getVerifiedParticipantId } from "@/lib/auth";
import { getChallenge, type ChallengeKey } from "@/lib/challenges";
import { logEvent } from "@/lib/events";

const bodySchema = z.object({
  challengeKey: z.string(),
  response: z.unknown(),
  reasoning: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const challenge = getChallenge(parsed.data.challengeKey as ChallengeKey);
  if (!challenge) {
    return NextResponse.json({ error: "Unknown challenge" }, { status: 400 });
  }

  const existing = await db.query.challengeResponses.findFirst({
    where: and(
      eq(challengeResponses.participantId, participantId),
      eq(challengeResponses.challengeKey, challenge.key)
    ),
  });

  if (existing) {
    await db
      .update(challengeResponses)
      .set({
        response: parsed.data.response,
        reasoning: parsed.data.reasoning ?? null,
        submittedAt: new Date(),
      })
      .where(eq(challengeResponses.id, existing.id));
  } else {
    await db.insert(challengeResponses).values({
      participantId,
      challengeKey: challenge.key,
      response: parsed.data.response,
      reasoning: parsed.data.reasoning ?? null,
    });
  }

  if (challenge.key === "the_problem") {
    const problemResponse = parsed.data.response as Record<string, string> | null;
    if (
      problemResponse &&
      typeof problemResponse.description === "string" &&
      typeof problemResponse.who === "string" &&
      typeof problemResponse.why === "string"
    ) {
      const existingProblem = await db.query.problems.findFirst({
        where: eq(problems.participantId, participantId),
      });
      if (existingProblem) {
        await db
          .update(problems)
          .set({
            description: problemResponse.description,
            whoExperiencesIt: problemResponse.who,
            whyItMatters: problemResponse.why,
          })
          .where(eq(problems.id, existingProblem.id));
      } else {
        await db.insert(problems).values({
          participantId,
          description: problemResponse.description,
          whoExperiencesIt: problemResponse.who,
          whyItMatters: problemResponse.why,
        });
      }
    }
  }

  await logEvent(participantId, "challenge_completed", { challengeKey: challenge.key });

  return NextResponse.json({ ok: true });
}

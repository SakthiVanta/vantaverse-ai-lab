import { NextRequest, NextResponse } from "next/server";
import { getParticipantOnboardingState } from "@/lib/participant-state";

export async function GET(req: NextRequest) {
  const state = await getParticipantOnboardingState(req);
  if (!state) {
    return NextResponse.json({ participant: null }, { status: 200 });
  }

  const { participant, completedChallengeKeys, nextChallengeKey, allChallengesComplete } =
    state;

  return NextResponse.json({
    participant: {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      emailVerified: participant.emailVerified,
      spiritId: participant.spiritId,
      githubConnected: participant.githubConnected,
      githubUsername: participant.githubUsername,
      status: participant.status,
    },
    completedChallengeKeys,
    nextChallengeKey,
    allChallengesComplete,
  });
}

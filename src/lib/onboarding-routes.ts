import type { OnboardingState } from "@/hooks/use-onboarding-state";

export function nextRouteFor(state: OnboardingState): string {
  if (!state.participant) return "/onboarding";
  if (!state.participant.emailVerified) return "/onboarding/verify";
  if (!state.participant.spiritId) return "/onboarding/github";
  if (state.nextChallengeKey) return `/onboarding/challenge/${state.nextChallengeKey}`;
  return "/onboarding/complete";
}

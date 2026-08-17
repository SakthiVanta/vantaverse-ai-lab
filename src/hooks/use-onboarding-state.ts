"use client";

import { useEffect, useState, useCallback } from "react";
import type { ChallengeKey } from "@/lib/challenges";

export type OnboardingParticipant = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  spiritId: string | null;
  githubConnected: boolean;
  githubUsername: string | null;
  status: string;
};

export type OnboardingState = {
  participant: OnboardingParticipant | null;
  completedChallengeKeys: ChallengeKey[];
  nextChallengeKey: ChallengeKey | null;
  allChallengesComplete: boolean;
};

const EMPTY_STATE: OnboardingState = {
  participant: null,
  completedChallengeKeys: [],
  nextChallengeKey: null,
  allChallengesComplete: false,
};

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/onboarding/me", { cache: "no-store" });
        const data = res.ok ? ((await res.json()) as OnboardingState) : EMPTY_STATE;
        if (!cancelled) setState(data);
      } catch {
        if (!cancelled) setState(EMPTY_STATE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  return { state, loading, refresh };
}

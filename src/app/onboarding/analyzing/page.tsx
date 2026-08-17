"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

const STEPS = [
  "Reading your choices…",
  "Understanding your reasoning…",
  "Looking at your building history…",
  "Connecting the signals…",
  "Creating your Builder Identity…",
];

export default function AnalyzingPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const [stepIndex, setStepIndex] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) {
      router.replace("/onboarding");
      return;
    }
    if (!state.allChallengesComplete) {
      router.replace(state.nextChallengeKey ? `/onboarding/challenge/${state.nextChallengeKey}` : "/onboarding");
      return;
    }
    if (started.current) return;
    started.current = true;

    fetch("/api/onboarding/complete", { method: "POST" }).finally(() => {
      router.push("/onboarding/complete");
    });
  }, [loading, state, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <OnboardingShell>
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="mb-10 h-16 w-16 rounded-full border-2 border-white/10 border-t-vv-violet"
        />
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-vv-cyan">
          Your signals are being built
        </p>
        <div className="mt-6 h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-foreground/60"
            >
              {STEPS[stepIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        {state?.participant?.githubConnected && (
          <p className="mt-8 max-w-xs text-xs text-foreground/35">
            Your public building history is being considered too.
          </p>
        )}
      </div>
    </OnboardingShell>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { SPIRITS } from "@/lib/spirits";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

export default function SpiritPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
  }, [loading, state, router]);

  const choose = async (spiritId: string) => {
    if (selecting) return;
    setSelecting(spiritId);
    await fetch("/api/onboarding/spirit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spiritId }),
    });
    router.push("/onboarding/challenge/the_unknown");
  };

  return (
    <OnboardingShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-vv-cyan">
          Choose Your Spirit
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          Don&apos;t think too much.
        </h1>

        <div className="mx-auto mt-10 grid max-w-md grid-cols-5 gap-3">
          {SPIRITS.map((spirit) => (
            <motion.button
              key={spirit.id}
              type="button"
              onClick={() => choose(spirit.id)}
              whileHover={{ y: -4, scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              disabled={!!selecting}
              className="flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl transition-colors disabled:opacity-40"
              style={
                selecting === spirit.id
                  ? { boxShadow: "0 0 0 2px var(--vv-violet)" }
                  : undefined
              }
            >
              {spirit.emoji}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </OnboardingShell>
  );
}

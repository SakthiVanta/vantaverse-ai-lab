"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
    try {
      const res = await fetch("/api/onboarding/spirit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spiritId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't save your spirit — try again.");
        setSelecting(null);
        return;
      }
    } catch {
      toast.error("You're offline — check your connection and try again.");
      setSelecting(null);
      return;
    }
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
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
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
              className="relative flex aspect-square items-center justify-center rounded-2xl border border-border bg-card text-3xl transition-colors disabled:opacity-40"
              style={
                selecting === spirit.id
                  ? { boxShadow: "0 0 0 2px var(--foreground)", opacity: 1 }
                  : undefined
              }
            >
              {selecting === spirit.id ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                spirit.emoji
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </OnboardingShell>
  );
}

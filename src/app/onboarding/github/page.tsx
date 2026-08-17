"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { GitFork, ArrowRight } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

const ERROR_MESSAGES: Record<string, string> = {
  denied: "GitHub connection was cancelled.",
  invalid_state: "That link expired. Try connecting again.",
  failed: "Couldn't read your GitHub data. Try again, or skip for now.",
  not_configured: "GitHub connection isn't set up yet — skip for now.",
};

export default function GithubConnectPage() {
  return (
    <Suspense fallback={null}>
      <GithubConnectContent />
    </Suspense>
  );
}

function GithubConnectContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { state, loading } = useOnboardingState();
  const error = params.get("error");

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) router.replace("/onboarding");
    else if (!state.participant.emailVerified) router.replace("/onboarding/verify");
    else if (state.participant.githubConnected) router.replace("/onboarding/spirit");
  }, [loading, state, router]);

  return (
    <OnboardingShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-vv-cyan">
          Building History
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          Show us what you&apos;ve built.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-foreground/50">
          We&apos;ll look at your public repositories, languages, and recent
          activity — as evidence, not a score.
        </p>

        {error && (
          <p className="mt-6 text-xs text-destructive">{ERROR_MESSAGES[error] ?? error}</p>
        )}

        <div className="mt-10 space-y-4">
          <Button
            render={<a href="/api/github/connect" />}
            size="lg"
            className="w-full gap-2"
          >
            <GitFork className="h-4 w-4" />
            Connect GitHub
          </Button>
          <button
            type="button"
            onClick={() => router.push("/onboarding/spirit")}
            className="mx-auto flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
          >
            Skip for now <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    </OnboardingShell>
  );
}

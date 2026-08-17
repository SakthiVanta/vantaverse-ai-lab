"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { AuroraBackground } from "@/components/landing/aurora-background";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { SIGNAL_LABELS, type SignalDimension } from "@/lib/signals";

type ResultData = {
  ready: boolean;
  archetype?: { primary: string; secondary: string | null };
  signals?: Record<SignalDimension, number>;
  strengthSignals?: string[];
  growthSignals?: string[];
  interests?: string[];
  githubSummary?: string | null;
  cardImageUrl?: string | null;
  problem?: { description: string; who: string; why: string } | null;
  firstDirection?: string;
};

export default function CompletePage() {
  return (
    <Suspense fallback={null}>
      <CompletePageContent />
    </Suspense>
  );
}

function CompletePageContent() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const { state, loading } = useOnboardingState(token);
  const [result, setResult] = useState<ResultData | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!state?.participant) {
      router.replace("/onboarding");
      return;
    }
    if (!state.allChallengesComplete) {
      router.replace(
        state.nextChallengeKey ? `/onboarding/challenge/${state.nextChallengeKey}` : "/onboarding"
      );
    }
  }, [loading, state, router]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      const url = token
        ? `/api/onboarding/result?token=${encodeURIComponent(token)}`
        : "/api/onboarding/result";
      const res = await fetch(url, { cache: "no-store" });
      const data: ResultData = await res.json();
      if (cancelled) return;
      if (data.ready) {
        setResult(data);
        setPolling(false);
        return;
      }
      attempts += 1;
      if (attempts < 15) {
        setTimeout(poll, 2000);
      } else {
        setPolling(false);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-16">
        {polling && !result && <FinalizingState />}
        {!polling && !result && <PendingState />}
        {result?.ready && state?.participant && (
          <ResultView result={result} participantId={state.participant.id} />
        )}
      </main>
    </div>
  );
}

function FinalizingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <div className="mb-6 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-vv-violet" />
      <p className="text-sm text-foreground/60">Finalizing your Builder Identity…</p>
    </motion.div>
  );
}

function PendingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <p className="font-heading text-2xl font-semibold">You&apos;re in.</p>
      <p className="mt-3 max-w-sm text-sm text-foreground/50">
        Your responses are saved. Your Builder Identity is still being finalized —
        we&apos;ll email it to you shortly.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-xs font-medium tracking-wide text-foreground/70 hover:border-white/20"
      >
        Back to Vantaverse
      </Link>
    </motion.div>
  );
}

function ResultView({ result, participantId }: { result: ResultData; participantId: string }) {
  const topSignals = Object.entries(result.signals ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [SignalDimension, number][];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-vv-cyan">
          Your Builder Identity is ready
        </p>
        <h1 className="text-gradient mt-3 font-heading text-3xl font-bold sm:text-4xl">
          {result.archetype?.primary}
        </h1>
        {result.archetype?.secondary && (
          <p className="mt-1 text-sm text-foreground/50">
            with traits of {result.archetype.secondary}
          </p>
        )}
      </div>

      <div className="mx-auto mt-8 max-w-xs overflow-hidden rounded-2xl border border-white/10 glow-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.cardImageUrl ?? `/api/builder-card/${participantId}`}
          alt="Your Builder Card"
          className="w-full"
        />
      </div>

      <div className="mt-12 space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
          Builder Signal
        </p>
        {topSignals.map(([key, value]) => (
          <div key={key}>
            <div className="mb-1 flex justify-between text-xs text-foreground/60">
              <span>{SIGNAL_LABELS[key]}</span>
              <span>{value}</span>
            </div>
            <Progress value={value} />
          </div>
        ))}
      </div>

      {!!result.interests?.length && (
        <div className="mt-10">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
            Current Interests
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {result.interests.map((interest) => (
              <Badge key={interest} variant="secondary">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {!!result.strengthSignals?.length && (
        <ReportSection title="What we observed">
          <ul className="space-y-2">
            {result.strengthSignals.map((s, i) => (
              <li key={i} className="text-sm text-foreground/70">
                · {s}
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {!!result.growthSignals?.length && (
        <ReportSection title="Growth opportunities">
          <ul className="space-y-2">
            {result.growthSignals.map((s, i) => (
              <li key={i} className="text-sm text-foreground/70">
                · {s}
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {result.githubSummary && (
        <ReportSection title="GitHub Building Snapshot">
          <p className="text-sm text-foreground/70">{result.githubSummary}</p>
        </ReportSection>
      )}

      {result.problem && (
        <ReportSection title="A problem you seem naturally drawn toward">
          <p className="text-sm text-foreground/70">{result.problem.description}</p>
          <p className="mt-1 text-xs text-foreground/45">Who: {result.problem.who}</p>
        </ReportSection>
      )}

      {result.firstDirection && (
        <ReportSection title="Your first Vantaverse direction">
          <p className="text-sm text-foreground/70">{result.firstDirection}</p>
        </ReportSection>
      )}

      <div className="mt-14 flex justify-center">
        <Link
          href="/"
          className="rounded-full bg-gradient-to-r from-vv-violet via-vv-magenta to-vv-cyan px-8 py-4 text-sm font-semibold text-white shadow-[0_0_40px_-8px_var(--vv-violet)]"
        >
          Enter Vantaverse Lab
        </Link>
      </div>
    </motion.div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

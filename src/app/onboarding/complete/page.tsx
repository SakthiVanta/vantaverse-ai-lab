"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Lock, Loader2, User } from "lucide-react";
import { SandBackground } from "@/components/landing/sand-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingChat } from "@/components/onboarding/floating-chat";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAiKeyStatus } from "@/hooks/use-ai-key-status";
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
  const { status: keyStatus, loading: keyLoading } = useAiKeyStatus();
  const [result, setResult] = useState<ResultData | null>(null);
  const [polling, setPolling] = useState(true);
  const [pollToken, setPollToken] = useState(0);

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
    // Wait to know whether a key exists before deciding how hard to poll —
    // without a key, analysis will never auto-complete, so there's no
    // point spinning for 30s; just check once.
    if (keyLoading) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = keyStatus?.hasKey ? 15 : 1;

    async function poll() {
      setPolling(true);
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
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setPolling(false);
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [token, pollToken, keyLoading, keyStatus?.hasKey]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <SandBackground />
      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-6">
        <span className="font-heading text-xs font-semibold tracking-[0.2em] text-foreground/50">
          VANTAVERSE
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/onboarding/profile"
            aria-label="Your profile"
            className="hairline inline-flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground/70 transition-colors hover:text-foreground"
          >
            <User className="h-3.5 w-3.5" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 pb-16">
        {polling && !result && <FinalizingState />}
        {!polling && !result && (
          <PendingState
            hasKey={!!keyStatus?.hasKey}
            keyLoading={keyLoading}
            onAnalysisStarted={() => setPollToken((t) => t + 1)}
          />
        )}
        {result?.ready && state?.participant && (
          <ResultView result={result} participantId={state.participant.id} />
        )}
      </main>
      <FloatingChat />
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
      <div className="mb-6 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-foreground" />
      <p className="text-sm text-foreground/60">Finalizing your Builder Identity…</p>
    </motion.div>
  );
}

function PendingState({
  hasKey,
  keyLoading,
  onAnalysisStarted,
}: {
  hasKey: boolean;
  keyLoading: boolean;
  onAnalysisStarted: () => void;
}) {
  const [running, setRunning] = useState(false);

  const runMyAnalysis = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/onboarding/analyze", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't run your analysis");
        return;
      }
      onAnalysisStarted();
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <p className="font-heading text-2xl font-semibold">You&apos;re in.</p>

      {keyLoading ? (
        <div className="mt-6 h-10 w-56 animate-pulse rounded-full bg-card" />
      ) : hasKey ? (
        <>
          <p className="mt-3 max-w-sm text-sm text-foreground/50">
            Your responses are saved, but your analysis hasn&apos;t run yet.
          </p>
          <Button className="mt-6 gap-2" size="lg" disabled={running} onClick={runMyAnalysis}>
            {running && <Loader2 className="h-4 w-4 animate-spin" />}
            {running ? "Analyzing…" : "Run my analysis"}
          </Button>
        </>
      ) : (
        <>
          <p className="mt-3 max-w-sm text-sm text-foreground/50">
            Your responses are saved. Your Builder Analysis runs on your own AI
            key — add one in your Profile to unlock it yourself, or wait for
            an admin to run it for you (you&apos;ll get an email either way).
          </p>
          <Link
            href="/onboarding/profile"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs font-semibold tracking-wide text-background"
          >
            <Lock className="h-3.5 w-3.5" />
            Add your AI key
          </Link>
        </>
      )}

      <Link
        href="/"
        className="mt-6 rounded-full border border-border bg-card px-6 py-3 text-xs font-medium tracking-wide text-foreground/70 hover:border-foreground/30"
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
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Your Builder Identity is ready
        </p>
        <h1 className="mt-3 font-heading text-3xl font-bold sm:text-4xl">
          {result.archetype?.primary}
        </h1>
        {result.archetype?.secondary && (
          <p className="mt-1 text-sm text-foreground/50">
            with traits of {result.archetype.secondary}
          </p>
        )}
      </div>

      <div className="hairline mx-auto mt-8 max-w-xs overflow-hidden rounded-2xl">
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
          href="/onboarding/dashboard"
          className="rounded-full bg-foreground px-8 py-4 text-sm font-semibold text-background transition-transform duration-300 hover:scale-[1.03]"
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

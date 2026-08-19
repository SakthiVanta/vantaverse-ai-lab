"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Download, ArrowRight, FolderKanban, FileText, Sparkles, Lock, Loader2 } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReportModal } from "@/components/report/report-modal";
import type { ReportResultData } from "@/components/report/report-view";
import { useOnboardingState } from "@/hooks/use-onboarding-state";
import { useAiKeyStatus } from "@/hooks/use-ai-key-status";
import { SIGNAL_LABELS, type SignalDimension } from "@/lib/signals";

type Project = {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  deadline: string | null;
  status: string;
  assignedAt: string;
};

type ResultData = ReportResultData & { ready: boolean };

export default function DashboardPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const { status: keyStatus, loading: keyLoading } = useAiKeyStatus();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [resultLoading, setResultLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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
    if (!state?.participant) return;
    fetch("/api/onboarding/projects", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((data) => setProjects(data.projects))
      .catch(() => setProjects([]));
  }, [state?.participant]);

  const loadResult = useCallback(async () => {
    if (!state?.participant) return;
    setResultLoading(true);
    try {
      const res = await fetch("/api/onboarding/result", { cache: "no-store" });
      const data: ResultData = await res.json();
      setResult(data);
    } catch {
      setResult({ ready: false });
    } finally {
      setResultLoading(false);
    }
  }, [state?.participant]);

  useEffect(() => {
    (async () => {
      await loadResult();
    })();
  }, [loadResult]);

  if (!state?.participant) return null;

  const cardUrl = `/api/builder-card/${state.participant.id}`;
  const sortedSignals = Object.entries(result?.signals ?? {}).sort(
    (a, b) => b[1] - a[1]
  ) as [SignalDimension, number][];

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/onboarding/analyze", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't run your analysis");
        return;
      }
      await loadResult();
      setReportOpen(true);
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const refreshAnalysis = async () => {
    setAnalyzing(true);
    try {
      const del = await fetch("/api/onboarding/analyze", { method: "DELETE" });
      if (!del.ok) {
        toast.error("Couldn't refresh your analysis");
        return;
      }
      const res = await fetch("/api/onboarding/analyze", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't refresh your analysis");
        return;
      }
      await loadResult();
      toast.success("Your report now reflects your connected GitHub");
    } catch {
      toast.error("You're offline — check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <OnboardingShell wide>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          {state.participant.name}
        </h1>

        <div className="mt-10 lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-10">
          <div>
            <div className="hairline mx-auto max-w-xs overflow-hidden rounded-2xl lg:mx-0 lg:max-w-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardUrl} alt="Your Builder Card" className="w-full" />
            </div>
            <a
              href={cardUrl}
              download="vantaverse-builder-card.png"
              className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground lg:mx-0"
            >
              <Download className="h-3.5 w-3.5" />
              Download your Builder Card
            </a>

            <div className="hairline mt-6 rounded-2xl bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
                Builder Report
              </p>

              {resultLoading ? (
                <div className="mt-4 h-11 animate-pulse rounded-full bg-background" />
              ) : result?.ready ? (
                <>
                  <p className="mt-2 text-sm text-foreground/60">
                    Your AI-generated Builder Report is ready.
                  </p>
                  <Button
                    className="mt-4 w-full gap-2"
                    variant="outline"
                    onClick={() => setReportOpen(true)}
                  >
                    <FileText className="h-4 w-4" />
                    View report
                  </Button>
                </>
              ) : keyLoading ? (
                <div className="mt-4 h-11 animate-pulse rounded-full bg-background" />
              ) : keyStatus?.hasKey ? (
                <>
                  <p className="mt-2 text-sm text-foreground/60">
                    Get a fresh, AI-written read on who you are as a builder.
                  </p>
                  <Button
                    className="analyze-glow mt-4 w-full gap-2"
                    disabled={analyzing}
                    onClick={runAnalysis}
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {analyzing ? "Analyzing…" : "Analyze my report — tell me about me"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-foreground/60">
                    Add your AI key to generate your Builder Report.
                  </p>
                  <Link
                    href="/onboarding/profile"
                    className="mt-4 flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-medium text-foreground/60 transition-colors hover:text-foreground"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Add your AI key
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-12 lg:mt-0">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
              Your Projects
            </p>

            {projects === null && (
              <div className="mt-4 space-y-2">
                <div className="h-16 animate-pulse rounded-2xl bg-card" />
                <div className="h-16 animate-pulse rounded-2xl bg-card" />
              </div>
            )}

            {projects?.length === 0 && (
              <div className="hairline mt-4 flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-10 text-center">
                <FolderKanban className="h-6 w-6 text-foreground/30" />
                <p className="text-sm text-foreground/50">
                  No projects yet — an admin will assign you one soon.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {projects?.map((p) => (
                <Link
                  key={p.id}
                  href={`/onboarding/projects/${p.id}`}
                  className="hairline flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-4 transition-colors hover:bg-accent/60"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{p.title}</span>
                      <Badge variant="secondary" className="capitalize">
                        {p.difficulty}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-foreground/45">{p.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-foreground/30" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {result?.ready && (
          <div className="mt-14">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
              Builder Signals
            </p>

            {result.githubSummary && (
              <div className="hairline mt-4 rounded-2xl bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
                  Your GitHub says about you
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                  {result.githubSummary}
                </p>
                {result.githubStale && keyStatus?.hasKey && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 gap-1.5"
                    disabled={analyzing}
                    onClick={refreshAnalysis}
                  >
                    {analyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {analyzing ? "Refreshing…" : "Refresh analysis with GitHub"}
                  </Button>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {sortedSignals.map(([key, value]) => (
                <div key={key} className="hairline rounded-2xl bg-card p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                    {SIGNAL_LABELS[key]}
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold">{value}</p>
                  <Progress value={value} className="mt-2" />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {result?.ready && (
        <ReportModal
          open={reportOpen}
          onOpenChange={setReportOpen}
          result={result}
          participantId={state.participant.id}
          onDeleted={loadResult}
        />
      )}
    </OnboardingShell>
  );
}

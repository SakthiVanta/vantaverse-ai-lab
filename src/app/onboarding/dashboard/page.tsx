"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Download, ArrowRight, FolderKanban } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Badge } from "@/components/ui/badge";
import { useOnboardingState } from "@/hooks/use-onboarding-state";

type Project = {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  deadline: string | null;
  status: string;
  assignedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { state, loading } = useOnboardingState();
  const [projects, setProjects] = useState<Project[] | null>(null);

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

  if (!state?.participant) return null;

  const cardUrl = `/api/builder-card/${state.participant.id}`;

  return (
    <OnboardingShell>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-4xl">
          {state.participant.name}
        </h1>

        <div className="hairline mx-auto mt-8 max-w-xs overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardUrl} alt="Your Builder Card" className="w-full" />
        </div>
        <a
          href={cardUrl}
          download="vantaverse-builder-card.png"
          className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground/70 transition-colors hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Download your Builder Card
        </a>

        <div className="mt-12">
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
      </motion.div>
    </OnboardingShell>
  );
}

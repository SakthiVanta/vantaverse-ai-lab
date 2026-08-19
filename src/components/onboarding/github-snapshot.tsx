"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitFork, Star, Users, Activity } from "lucide-react";
import { GithubHeatmap } from "./github-heatmap";
import { Badge } from "@/components/ui/badge";
import {
  summarizeGithubActivity,
  computeRepoKpis,
  topLanguages,
  topReposByStars,
  type GithubRepoInput,
} from "@/lib/github-summary";
import { LANGUAGE_COLORS } from "@/lib/language-colors";
import type { ContributionCalendar } from "@/lib/github";

type GithubData = {
  username: string;
  profile: { followers: number; publicRepos: number; createdAt: string } | null;
  repositories: GithubRepoInput[];
  selectedRepoNames: string[] | null;
  contributionCalendar: ContributionCalendar;
  commitContributionsLastYear: number;
  reposContributedToLastYear: number;
  openSourceContribution: string | null;
};

/** Self-contained GitHub KPI section for the builder's own dashboard —
 * fetches its own data so the dashboard page doesn't need to know its
 * shape. Renders a connect CTA when GitHub isn't linked yet. */
export function GithubSnapshot({ connected }: { connected: boolean }) {
  const [data, setData] = useState<GithubData | null>(null);
  const [loading, setLoading] = useState(connected);

  useEffect(() => {
    if (!connected) return;
    fetch("/api/onboarding/github/repos", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [connected]);

  if (!connected) {
    return (
      <div className="hairline flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-10 text-center">
        <GitFork className="h-6 w-6 text-foreground/30" />
        <p className="max-w-sm text-sm text-foreground/50">
          Connect GitHub to unlock your building snapshot — languages, stars, activity, and top
          repos, all pulled from your real work.
        </p>
        <Link
          href="/onboarding/profile"
          className="text-xs font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
        >
          Connect GitHub
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
        ))}
      </div>
    );
  }

  const repos = data.selectedRepoNames
    ? data.repositories.filter((r) => data.selectedRepoNames!.includes(r.name))
    : data.repositories;
  const summary = summarizeGithubActivity(repos);
  const { totalStars, totalForks } = computeRepoKpis(repos);
  const languages = topLanguages(summary.languageBreakdown);
  const highlights = topReposByStars(repos, 4);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<GitFork className="h-3.5 w-3.5" />} label="Repos" value={summary.repoCount} />
        <KpiTile icon={<Star className="h-3.5 w-3.5" />} label="Stars earned" value={totalStars} />
        <KpiTile icon={<GitFork className="h-3.5 w-3.5" />} label="Forks earned" value={totalForks} />
        <KpiTile icon={<Users className="h-3.5 w-3.5" />} label="Followers" value={data.profile?.followers ?? 0} />
        <KpiTile icon={<Activity className="h-3.5 w-3.5" />} label="Activity" value={summary.activitySignal} />
        <KpiTile label="Diversity" value={summary.projectDiversity} />
        <KpiTile label="Commits (~yr)" value={data.commitContributionsLastYear} />
        <KpiTile label="Open-source" value={data.openSourceContribution ?? "—"} />
      </div>

      {languages.length > 0 && (
        <div className="hairline rounded-2xl bg-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">Languages</p>
          <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-background">
            {languages.map(([lang, pct], i) => (
              <div
                key={lang}
                style={{ width: `${pct}%`, backgroundColor: LANGUAGE_COLORS[i % LANGUAGE_COLORS.length] }}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {languages.map(([lang, pct], i) => (
              <div key={lang} className="flex items-center gap-1.5 text-xs text-foreground/60">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: LANGUAGE_COLORS[i % LANGUAGE_COLORS.length] }}
                />
                {lang}
                <span className="text-foreground/35">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.projectThemes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.projectThemes.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {highlights.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {highlights.map((r) => (
            <div key={r.name} className="hairline rounded-xl bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground/85">{r.name}</p>
                <span className="flex shrink-0 items-center gap-1 text-xs text-foreground/45">
                  <Star className="h-3 w-3" /> {r.stargazersCount}
                </span>
              </div>
              {r.description && (
                <p className="mt-0.5 truncate text-xs text-foreground/45">{r.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {data.contributionCalendar && <GithubHeatmap calendar={data.contributionCalendar} />}
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="hairline rounded-2xl bg-card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground/45">
        {icon} {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold text-foreground/90">{value}</p>
    </div>
  );
}

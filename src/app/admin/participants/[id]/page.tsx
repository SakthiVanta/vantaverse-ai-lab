import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  participants,
  challengeResponses,
  githubProfiles,
  aiAnalyses,
  problems,
  events,
} from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { AdminHeader } from "@/components/admin/admin-header";
import { ParticipantActions } from "@/components/admin/participant-actions";
import { Badge } from "@/components/ui/badge";
import { getSpiritById } from "@/lib/spirits";
import { CHALLENGES } from "@/lib/challenges";
import {
  countOwnedNonForkRepos,
  computeRepoKpis,
  summarizeGithubActivity,
  type GithubRepoInput,
} from "@/lib/github-summary";
import { ArrowLeft, Star, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
  });
  if (!participant) notFound();

  const [responses, github, analysis, problem, timeline] = await Promise.all([
    db.query.challengeResponses.findMany({
      where: eq(challengeResponses.participantId, id),
    }),
    db.query.githubProfiles.findFirst({ where: eq(githubProfiles.participantId, id) }),
    db.query.aiAnalyses.findFirst({ where: eq(aiAnalyses.participantId, id) }),
    db.query.problems.findFirst({ where: eq(problems.participantId, id) }),
    db.query.events.findMany({
      where: eq(events.participantId, id),
      orderBy: asc(events.createdAt),
    }),
  ]);

  const spirit = participant.spiritId ? getSpiritById(participant.spiritId) : undefined;
  const responseByKey = new Map(responses.map((r) => [r.challengeKey, r]));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground/70"
        >
          <ArrowLeft className="h-3 w-3" /> All builders
        </Link>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-3xl">
            {spirit?.emoji ?? "👤"}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">{participant.name}</h1>
            <p className="text-sm text-foreground/50">
              {analysis?.primaryArchetype ?? "Not yet analyzed"}
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto">
            {participant.status.replaceAll("_", " ")}
          </Badge>
        </div>

        <div className="mt-6">
          <ParticipantActions
            participantId={id}
            hasAnalysis={!!analysis}
            githubConnected={!!participant.githubConnected}
          />
        </div>

        <Section title="Identity">
          <InfoRow label="Email" value={participant.email} />
          <InfoRow label="GitHub" value={participant.githubUsername ?? "Not connected"} />
          <InfoRow
            label="AI key"
            value={participant.aiApiKeyEncrypted ? `Own key added (••••${participant.aiApiKeyLast4?.replace("••••", "") ?? ""})` : "Not added — needs admin fallback"}
          />
          <InfoRow label="Joined" value={new Date(participant.createdAt).toLocaleString()} />
          <InfoRow
            label="Completed"
            value={participant.completedAt ? new Date(participant.completedAt).toLocaleString() : "—"}
          />
        </Section>

        {analysis && (
          <Section title="AI Analysis">
            <InfoRow
              label="Analyzed via"
              value={analysis.keySource === "own" ? "Their own AI key" : "Admin fallback key"}
            />
            <InfoRow label="Confidence" value={analysis.confidence} />
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
              {Object.entries(analysis.signals as Record<string, number>).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-foreground/50">{k.replaceAll("_", " ")}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                Strengths
              </p>
              <ul className="mt-2 space-y-1">
                {(analysis.strengthSignals as string[]).map((s, i) => (
                  <li key={i} className="text-sm text-foreground/70">· {s}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                Growth areas
              </p>
              <ul className="mt-2 space-y-1">
                {(analysis.growthSignals as string[]).map((s, i) => (
                  <li key={i} className="text-sm text-foreground/70">· {s}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                Evidence
              </p>
              <ul className="mt-2 space-y-3">
                {(analysis.evidence as { observation: string; evidence: string }[]).map(
                  (e, i) => (
                    <li key={i} className="text-sm">
                      <p className="text-foreground/80">{e.observation}</p>
                      <p className="mt-0.5 text-xs text-foreground/45">{e.evidence}</p>
                    </li>
                  )
                )}
              </ul>
            </div>
          </Section>
        )}

        {github && (
          <Section title="GitHub Building History">
            {(() => {
              const profile = (github.profile as {
                name: string | null;
                bio: string | null;
                avatarUrl: string;
                followers: number;
                publicRepos: number;
                createdAt: string;
              } | null) ?? null;
              if (!profile) return null;
              return (
                <div className="flex items-start gap-3 border-b border-border pb-5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={profile.avatarUrl}
                    alt={github.username}
                    className="h-12 w-12 shrink-0 rounded-full border border-border"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground/90">
                      {profile.name ?? github.username}{" "}
                      <span className="font-normal text-foreground/40">@{github.username}</span>
                    </p>
                    {profile.bio && (
                      <p className="mt-0.5 text-sm text-foreground/60">{profile.bio}</p>
                    )}
                    <p className="mt-1 text-xs text-foreground/40">
                      {profile.followers} followers · {profile.publicRepos} public repos · on
                      GitHub since {new Date(profile.createdAt).getFullYear()}
                    </p>
                  </div>
                </div>
              );
            })()}

            {github.aiSummary ? (
              <div className="hairline mt-5 rounded-2xl bg-background p-5">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
                  <Sparkles className="h-3 w-3" /> Your GitHub says about you
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                  {github.aiSummary}
                </p>
                {github.aiSummaryGeneratedAt && (
                  <p className="mt-2 text-[11px] text-foreground/35">
                    Generated {new Date(github.aiSummaryGeneratedAt).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-5 text-sm text-foreground/45">
                No GitHub AI narrative yet — click &ldquo;Analyze GitHub&rdquo; above to generate one.
              </p>
            )}

            {(() => {
              const repos = (github.repositories as GithubRepoInput[] | null) ?? [];
              const { totalStars, totalForks } = computeRepoKpis(repos);
              const diversity = summarizeGithubActivity(repos).projectDiversity;
              return (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatTile label="Repos analyzed" value={countOwnedNonForkRepos(github.repositories)} />
                  <StatTile label="Activity" value={github.activitySignal ?? "—"} />
                  <StatTile label="AI project evidence" value={github.aiProjectEvidence ?? "—"} />
                  <StatTile label="Stars earned" value={totalStars} />
                  <StatTile label="Forks earned" value={totalForks} />
                  <StatTile label="Project diversity" value={diversity} />
                  <StatTile label="Commits (last ~year)" value={github.commitContributionsLastYear ?? 0} />
                  <StatTile label="Repos contributed to" value={github.reposContributedToLastYear ?? 0} />
                  <StatTile label="Open-source signal" value={github.openSourceContribution ?? "—"} />
                </div>
              );
            })()}

            {(() => {
              const themes = ((github.projectThemes as string[]) ?? []).filter(Boolean);
              if (!themes.length) return null;
              return (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                    Themes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {themes.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const languages = topLanguages(
                (github.languageBreakdown as Record<string, number>) ?? {}
              );
              if (!languages.length) return null;
              return (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                    Languages
                  </p>
                  <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-background">
                    {languages.map(([lang, pct], i) => (
                      <div
                        key={lang}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: LANGUAGE_COLORS[i % LANGUAGE_COLORS.length],
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {languages.map(([lang, pct], i) => (
                      <div
                        key={lang}
                        className="flex items-center gap-1.5 text-xs text-foreground/60"
                      >
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
              );
            })()}

            {(() => {
              const repos = topRepos(github.repositories);
              if (!repos.length) return null;
              return (
                <div className="mt-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/40">
                    Top repositories
                  </p>
                  <div className="mt-3 space-y-2">
                    {repos.map((r) => (
                      <div
                        key={r.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground/85">
                            {r.name}
                          </p>
                          {r.description && (
                            <p className="truncate text-xs text-foreground/45">{r.description}</p>
                          )}
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-foreground/50">
                          <Star className="h-3 w-3" /> {r.stargazersCount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <p className="mt-6 text-sm text-foreground/70">
              {describeOpenSourceSignal(
                github.openSourceContribution,
                github.commitContributionsLastYear ?? 0,
                github.reposContributedToLastYear ?? 0
              )}
            </p>
          </Section>
        )}

        {problem && (
          <Section title="Problem Submitted">
            <p className="text-sm text-foreground/80">{problem.description}</p>
            <p className="mt-1 text-xs text-foreground/50">Who: {problem.whoExperiencesIt}</p>
            <p className="text-xs text-foreground/50">Why it matters: {problem.whyItMatters}</p>
          </Section>
        )}

        <Section title="Challenge Responses">
          <div className="space-y-5">
            {CHALLENGES.map((c) => {
              const r = responseByKey.get(c.key);
              if (!r) return null;
              return (
                <div key={c.key} className="border-b border-border pb-4 last:border-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {c.title}
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground/60">
                    {JSON.stringify(r.response, null, 2)}
                  </pre>
                  {r.reasoning && (
                    <p className="mt-1 text-sm italic text-foreground/70">
                      &ldquo;{r.reasoning}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Interaction Timeline">
          <ul className="space-y-1.5">
            {timeline.map((e) => (
              <li key={e.id} className="flex justify-between text-xs">
                <span className="text-foreground/70">{e.type.replaceAll("_", " ")}</span>
                <span className="text-foreground/35">
                  {new Date(e.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
            {timeline.length === 0 && (
              <p className="text-xs text-foreground/40">No events recorded</p>
            )}
          </ul>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">
        {label}
      </p>
      <p className="mt-1 font-heading text-lg font-semibold text-foreground/90">{value}</p>
    </div>
  );
}

const LANGUAGE_COLORS = [
  "#e8b84b",
  "#5b8dd6",
  "#d67abf",
  "#6bc48f",
  "#e06b6b",
  "#9c7fe0",
  "#4fb8c4",
  "#c4924f",
];

/** Top languages by byte-weighted percentage, filtering the long tail of
 * near-zero entries a raw byte breakdown always produces, and folding
 * whatever's left into a single "Other" slice so the total still sums to
 * ~100%. */
function topLanguages(
  breakdown: Record<string, number>,
  { threshold = 1, max = 6 }: { threshold?: number; max?: number } = {}
): [string, number][] {
  const sorted = Object.entries(breakdown)
    .filter(([, pct]) => pct >= threshold)
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length <= max) return sorted;
  const top = sorted.slice(0, max - 1);
  const otherPct = sorted.slice(max - 1).reduce((sum, [, pct]) => sum + pct, 0);
  return otherPct > 0 ? [...top, ["Other", otherPct]] : top;
}

/** Owned, non-fork, non-archived repos ranked by stars (falling back to
 * recency for repos with none), capped for a compact list. */
function topRepos(repositories: unknown, max = 5): GithubRepoInput[] {
  if (!Array.isArray(repositories)) return [];
  return (repositories as GithubRepoInput[])
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => {
      if (b.stargazersCount !== a.stargazersCount) return b.stargazersCount - a.stargazersCount;
      return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    })
    .slice(0, max);
}

function describeOpenSourceSignal(
  level: string | null,
  commits: number,
  reposContributedTo: number
): string {
  if (!level) return "No open-source contribution signal yet.";
  if (commits === 0 && reposContributedTo === 0) {
    return `${level} — no commit contributions detected in the last ~year.`;
  }
  return `${level} — ${commits} commit contribution${commits === 1 ? "" : "s"} across ${reposContributedTo} repo${reposContributedTo === 1 ? "" : "s"} in the last ~year.`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-foreground/50">{label}</span>
      <span className="text-foreground/85">{value}</span>
    </div>
  );
}

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
import { ArrowLeft } from "lucide-react";

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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl">
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
          <ParticipantActions participantId={id} hasAnalysis={!!analysis} />
        </div>

        <Section title="Identity">
          <InfoRow label="Email" value={participant.email} />
          <InfoRow label="GitHub" value={participant.githubUsername ?? "Not connected"} />
          <InfoRow label="Joined" value={new Date(participant.createdAt).toLocaleString()} />
          <InfoRow
            label="Completed"
            value={participant.completedAt ? new Date(participant.completedAt).toLocaleString() : "—"}
          />
        </Section>

        {analysis && (
          <Section title="AI Analysis">
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
            <InfoRow label="Repos analyzed" value={String((github.repositories as unknown[])?.length ?? 0)} />
            <InfoRow label="Activity" value={github.activitySignal ?? "—"} />
            <InfoRow label="AI project evidence" value={github.aiProjectEvidence ?? "—"} />
            <InfoRow
              label="Themes"
              value={((github.projectThemes as string[]) ?? []).join(", ") || "—"}
            />
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
                <div key={c.key} className="border-b border-white/5 pb-4 last:border-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-vv-cyan">
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
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
      <span className="text-foreground/50">{label}</span>
      <span className="text-foreground/85">{value}</span>
    </div>
  );
}

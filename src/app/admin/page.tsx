import Link from "next/link";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { desc } from "drizzle-orm";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [allParticipants, analyses, githubData, allProblems] = await Promise.all([
    db.query.participants.findMany({ orderBy: desc(participants.createdAt) }),
    db.query.aiAnalyses.findMany(),
    db.query.githubProfiles.findMany(),
    db.query.problems.findMany(),
  ]);

  const total = allParticipants.length;
  const completed = allParticipants.filter((p) => p.status === "onboarding_completed" || p.status === "analysis_completed").length;
  const inProgress = total - completed;

  const archetypeCounts = analyses.reduce<Record<string, number>>((acc, a) => {
    acc[a.primaryArchetype] = (acc[a.primaryArchetype] ?? 0) + 1;
    return acc;
  }, {});

  const githubConnected = allParticipants.filter((p) => p.githubConnected).length;
  const aiProjectEvidence = githubData.filter(
    (g) => g.aiProjectEvidence === "Strong" || g.aiProjectEvidence === "Moderate"
  ).length;
  const activeDevelopers = githubData.filter((g) => g.activitySignal === "High").length;

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Founding Builders
        </p>
        <div className="mt-3 flex flex-wrap gap-8">
          <Stat label="Total" value={total} />
          <Stat label="Completed" value={completed} />
          <Stat label="In progress" value={inProgress} />
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <Card title="Builder Intelligence">
            {Object.keys(archetypeCounts).length === 0 && (
              <EmptyLine>No analyses yet</EmptyLine>
            )}
            {Object.entries(archetypeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([archetype, count]) => (
                <Row key={archetype} label={archetype} value={count} />
              ))}
          </Card>
          <Card title="GitHub">
            <Row label="Connected" value={githubConnected} />
            <Row label="AI project evidence" value={aiProjectEvidence} />
            <Row label="Active developers" value={activeDevelopers} />
          </Card>
          <Card title="Problems">
            <Row label="Submitted" value={allProblems.length} />
            <Row
              label="Unique clusters"
              value={new Set(allProblems.map((p) => p.cluster).filter(Boolean)).size}
            />
          </Card>
        </div>

        <div className="mt-12">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-foreground/40">
            Builders
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>GitHub</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allParticipants.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/admin/participants/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground/60">{p.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground/60">
                      {p.githubConnected ? p.githubUsername : "—"}
                    </TableCell>
                    <TableCell className="text-foreground/40">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {allParticipants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-foreground/40">
                      No builders yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-heading text-3xl font-bold">{value}</div>
      <div className="text-xs text-foreground/40">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-foreground/40">
        {title}
      </p>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground/70">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/40">{children}</p>;
}

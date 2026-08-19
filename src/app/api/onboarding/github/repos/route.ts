import { NextResponse } from "next/server";
import { db } from "@/db";
import { githubProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getVerifiedParticipantId } from "@/lib/auth";
import { summarizeGithubActivity, type GithubRepoInput } from "@/lib/github-summary";

export async function GET() {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const profile = await db.query.githubProfiles.findFirst({
    where: eq(githubProfiles.participantId, participantId),
  });
  if (!profile) return NextResponse.json({ error: "Connect GitHub first" }, { status: 404 });

  return NextResponse.json({
    username: profile.username,
    profile: profile.profile,
    repositories: profile.repositories,
    selectedRepoNames: profile.selectedRepoNames,
    contributionCalendar: profile.contributionCalendar,
    commitContributionsLastYear: profile.commitContributionsLastYear,
    reposContributedToLastYear: profile.reposContributedToLastYear,
    openSourceContribution: profile.openSourceContribution,
  });
}

const bodySchema = z.object({
  selectedRepoNames: z.array(z.string()).max(500),
});

/** Re-derives the language/theme/activity summary from a subset of the
 * already-fetched repo data — no GitHub API call, no token needed. */
export async function POST(req: Request) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  const profile = await db.query.githubProfiles.findFirst({
    where: eq(githubProfiles.participantId, participantId),
  });
  if (!profile) return NextResponse.json({ error: "Connect GitHub first" }, { status: 404 });

  const allRepos = (profile.repositories as GithubRepoInput[]) ?? [];
  const selectedNames = new Set(parsed.data.selectedRepoNames);
  const validNames = parsed.data.selectedRepoNames.filter((name) =>
    allRepos.some((r) => r.name === name)
  );
  const selected = allRepos.filter((r) => selectedNames.has(r.name));
  const summary = summarizeGithubActivity(selected);

  await db
    .update(githubProfiles)
    .set({
      selectedRepoNames: validNames,
      languageBreakdown: summary.languageBreakdown,
      projectThemes: summary.projectThemes,
      activitySignal: summary.activitySignal,
      aiProjectEvidence: summary.aiProjectEvidence,
    })
    .where(eq(githubProfiles.id, profile.id));

  return NextResponse.json({ ok: true, selectedCount: validNames.length });
}

import { db } from "@/db";
import { githubProfiles, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { fetchGithubProfileData } from "@/lib/github";
import { summarizeGithubActivity, deriveContributionSignal } from "@/lib/github-summary";
import { runGithubNarrative } from "@/lib/gemini";
import { requireAdminFallbackKey } from "@/lib/ai-key";

export class GithubTokenMissingError extends Error {
  constructor() {
    super(
      "This builder connected GitHub before token storage was added — ask them to reconnect GitHub from their onboarding page, then GitHub AI Analysis will work."
    );
    this.name = "GithubTokenMissingError";
  }
}

/** Fetches fresh data from GitHub with `accessToken` and saves it. When
 * `preserveSelection` is true, the summary (languages/themes/activity) is
 * recomputed over whatever repo subset the builder already curated, so a
 * refresh never silently widens the set they chose to be analyzed on. */
async function saveGithubProfile(
  participantId: string,
  accessToken: string,
  opts: { preserveSelection: boolean }
) {
  const profile = await fetchGithubProfileData(accessToken);

  const existing = await db.query.githubProfiles.findFirst({
    where: eq(githubProfiles.participantId, participantId),
  });

  const selectedNames = opts.preserveSelection
    ? (existing?.selectedRepoNames as string[] | null)
    : null;
  const reposForSummary = selectedNames
    ? profile.repos.filter((r) => selectedNames.includes(r.name))
    : profile.repos;

  const summary = summarizeGithubActivity(reposForSummary);
  const openSourceContribution = deriveContributionSignal({
    totalCommitContributions: profile.commitContributionsLastYear,
    totalRepositoriesWithContributedCommits: profile.reposContributedToLastYear,
  });

  const values = {
    username: profile.login,
    profile: {
      name: profile.name,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      followers: profile.followers,
      publicRepos: profile.publicRepos,
      createdAt: profile.createdAt,
    },
    repositories: profile.repos,
    languageBreakdown: summary.languageBreakdown,
    projectThemes: summary.projectThemes,
    activitySignal: summary.activitySignal,
    aiProjectEvidence: summary.aiProjectEvidence,
    commitContributionsLastYear: profile.commitContributionsLastYear,
    reposContributedToLastYear: profile.reposContributedToLastYear,
    openSourceContribution,
    contributionCalendar: profile.contributionCalendar,
    githubAccessTokenEncrypted: encryptSecret(accessToken),
    fetchedAt: new Date(),
  };

  if (existing) {
    await db.update(githubProfiles).set(values).where(eq(githubProfiles.id, existing.id));
  } else {
    await db.insert(githubProfiles).values({ participantId, ...values });
  }

  await db
    .update(participants)
    .set({
      githubUsername: profile.login,
      githubConnected: true,
      githubConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId));

  return { summary, username: profile.login };
}

/** First-time OAuth connect — no prior repo selection to preserve. */
export async function connectGithubProfile(participantId: string, accessToken: string) {
  return saveGithubProfile(participantId, accessToken, { preserveSelection: false });
}

/** Admin-triggered re-fetch using the token saved at connect time. */
export async function refreshGithubProfile(participantId: string) {
  const existing = await db.query.githubProfiles.findFirst({
    where: eq(githubProfiles.participantId, participantId),
  });
  if (!existing) throw new Error("GitHub is not connected for this participant.");
  if (!existing.githubAccessTokenEncrypted) throw new GithubTokenMissingError();

  const accessToken = decryptSecret(existing.githubAccessTokenEncrypted);
  return saveGithubProfile(participantId, accessToken, { preserveSelection: true });
}

/** Pulls fresh data from GitHub, then writes a "your GitHub says about
 * you" narrative from it. Always uses the admin fallback AI key — this is
 * an admin-only action, independent of the builder's own key and of the
 * full behavioral analysis (which additionally requires challenge
 * responses). Throws GithubTokenMissingError the same way refresh does if
 * no token was ever stored for this participant. */
export async function runGithubAiAnalysis(participantId: string) {
  const { summary, username } = await refreshGithubProfile(participantId);

  const [profileRow, participant] = await Promise.all([
    db.query.githubProfiles.findFirst({ where: eq(githubProfiles.participantId, participantId) }),
    db.query.participants.findFirst({ where: eq(participants.id, participantId) }),
  ]);
  if (!profileRow) throw new Error("GitHub profile not found after refresh.");

  const apiKey = requireAdminFallbackKey();
  const aiSummary = await runGithubNarrative(apiKey, participant?.name ?? username, {
    username,
    languageBreakdown: summary.languageBreakdown,
    projectThemes: summary.projectThemes,
    activitySignal: summary.activitySignal,
    aiProjectEvidence: summary.aiProjectEvidence,
    repoCount: summary.repoCount,
    commitContributionsLastYear: profileRow.commitContributionsLastYear ?? 0,
    reposContributedToLastYear: profileRow.reposContributedToLastYear ?? 0,
    openSourceContribution: profileRow.openSourceContribution ?? "Limited",
  });

  await db
    .update(githubProfiles)
    .set({ aiSummary, aiSummaryGeneratedAt: new Date() })
    .where(eq(githubProfiles.id, profileRow.id));

  return { summary, aiSummary };
}

/** Admin-triggered disconnect: deletes all stored GitHub data (profile,
 * repos, encrypted token, AI narrative) and marks the participant as not
 * connected. The only way data comes back is the builder reconnecting
 * GitHub themselves from onboarding — this never re-populates on its own. */
export async function revokeGithubConnection(participantId: string) {
  await db.delete(githubProfiles).where(eq(githubProfiles.participantId, participantId));
  await db
    .update(participants)
    .set({
      githubConnected: false,
      githubUsername: null,
      githubConnectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId));
}

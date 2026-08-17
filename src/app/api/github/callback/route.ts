import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { participants, githubProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/session";
import { exchangeGithubCode, fetchGithubProfileData } from "@/lib/github";
import { summarizeGithubActivity } from "@/lib/github-summary";
import { logEvent } from "@/lib/events";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/onboarding/github?error=denied", appUrl));
  }

  const payload = await verifySession<{ participantId: string }>(state);
  if (!payload) {
    return NextResponse.redirect(new URL("/onboarding/github?error=invalid_state", appUrl));
  }
  const { participantId } = payload;

  try {
    const accessToken = await exchangeGithubCode(code);
    const profile = await fetchGithubProfileData(accessToken);
    const summary = summarizeGithubActivity(profile.repos);

    const existing = await db.query.githubProfiles.findFirst({
      where: eq(githubProfiles.participantId, participantId),
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
        githubAccessToken: accessToken,
        githubConnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(participants.id, participantId));

    await logEvent(participantId, "github_connected", { username: profile.login });

    return NextResponse.redirect(new URL("/onboarding/spirit", appUrl));
  } catch (err) {
    console.error("GitHub connect failed:", err);
    return NextResponse.redirect(new URL("/onboarding/github?error=failed", appUrl));
  }
}

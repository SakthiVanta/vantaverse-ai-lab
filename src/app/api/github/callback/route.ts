import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session";
import { exchangeGithubCode } from "@/lib/github";
import { connectGithubProfile } from "@/lib/github-profile";
import { logEvent } from "@/lib/events";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/onboarding/github?error=denied", appUrl));
  }

  const payload = await verifySession<{ participantId: string; returnTo?: string }>(state);
  if (!payload) {
    return NextResponse.redirect(new URL("/onboarding/github?error=invalid_state", appUrl));
  }
  const { participantId, returnTo = "/onboarding/spirit" } = payload;

  try {
    const accessToken = await exchangeGithubCode(code);
    // preserveSelection: false — a reconnect keeps whatever the builder
    // previously curated (selectedRepoNames is untouched by this save);
    // the picker page decides the default only when it's still null.
    const { username } = await connectGithubProfile(participantId, accessToken);

    await logEvent(participantId, "github_connected", { username });

    const selectReposUrl = new URL("/onboarding/github/select-repos", appUrl);
    selectReposUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(selectReposUrl);
  } catch (err) {
    console.error("GitHub connect failed:", err);
    return NextResponse.redirect(new URL(`${returnTo}?error=failed`, appUrl));
  }
}

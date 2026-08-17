import { NextResponse } from "next/server";
import { getCurrentParticipantId } from "@/lib/auth";
import { signSession } from "@/lib/session";
import { buildGithubAuthUrl } from "@/lib/github";

export async function GET() {
  const participantId = await getCurrentParticipantId();
  if (!participantId) {
    return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL));
  }

  const state = await signSession({ participantId }, "10m");

  try {
    return NextResponse.redirect(buildGithubAuthUrl(state));
  } catch {
    return NextResponse.redirect(
      new URL("/onboarding/github?error=not_configured", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}

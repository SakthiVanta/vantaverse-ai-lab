import { NextRequest, NextResponse } from "next/server";
import { getVerifiedParticipantId } from "@/lib/auth";
import { signSession } from "@/lib/session";
import { buildGithubAuthUrl } from "@/lib/github";

const ALLOWED_RETURN_PATHS = ["/onboarding/spirit", "/onboarding/profile"];

export async function GET(req: NextRequest) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.redirect(new URL("/onboarding", process.env.NEXT_PUBLIC_APP_URL));
  }

  // Allowlisted, never an open redirect — the only two places this flow
  // can be entered from.
  const requestedReturnTo = req.nextUrl.searchParams.get("returnTo");
  const returnTo = ALLOWED_RETURN_PATHS.includes(requestedReturnTo ?? "")
    ? requestedReturnTo!
    : "/onboarding/spirit";

  const state = await signSession({ participantId, returnTo }, "10m");

  try {
    return NextResponse.redirect(buildGithubAuthUrl(state));
  } catch {
    return NextResponse.redirect(
      new URL(`${returnTo}?error=not_configured`, process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}

import { NextResponse } from "next/server";
import { refreshGithubProfile, GithubTokenMissingError } from "@/lib/github-profile";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { summary } = await refreshGithubProfile(id);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    if (err instanceof GithubTokenMissingError) {
      return NextResponse.json({ error: err.message, needsReconnect: true }, { status: 409 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub refresh failed" },
      { status: 500 }
    );
  }
}

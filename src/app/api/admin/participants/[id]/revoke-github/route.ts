import { NextResponse } from "next/server";
import { revokeGithubConnection } from "@/lib/github-profile";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await revokeGithubConnection(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not revoke GitHub connection" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { resolveProjectActor } from "@/lib/project-access";
import { getProjectParticipantMembers } from "@/lib/project-members";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await getProjectParticipantMembers(id);

  return NextResponse.json({
    members: [{ id: "admin", name: "Admin", emoji: "🛡️", isAdminAlias: true }, ...members],
  });
}

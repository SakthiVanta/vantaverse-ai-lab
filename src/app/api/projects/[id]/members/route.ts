import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignmentTargets, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";
import { getSpiritById } from "@/lib/spirits";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({ id: participants.id, name: participants.name, spiritId: participants.spiritId })
    .from(assignmentTargets)
    .innerJoin(participants, eq(participants.id, assignmentTargets.participantId))
    .where(eq(assignmentTargets.assignmentId, id));

  return NextResponse.json({
    members: [
      { id: "admin", name: "Admin", emoji: "🛡️", isAdminAlias: true },
      ...rows.map((r) => ({
        id: r.id,
        name: r.name,
        emoji: r.spiritId ? getSpiritById(r.spiritId)?.emoji ?? "👤" : "👤",
        isAdminAlias: false,
      })),
    ],
  });
}

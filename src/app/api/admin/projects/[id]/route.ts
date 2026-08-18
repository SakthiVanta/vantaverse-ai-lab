import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, assignmentTargets, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const project = await db.query.assignments.findFirst({
    where: eq(assignments.id, id),
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const members = await db
    .select({
      targetId: assignmentTargets.id,
      status: assignmentTargets.status,
      createdAt: assignmentTargets.createdAt,
      participantId: participants.id,
      name: participants.name,
      email: participants.email,
    })
    .from(assignmentTargets)
    .innerJoin(participants, eq(participants.id, assignmentTargets.participantId))
    .where(eq(assignmentTargets.assignmentId, id));

  return NextResponse.json({ project, members });
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignments, assignmentTargets } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getVerifiedParticipantId } from "@/lib/auth";

export async function GET() {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      difficulty: assignments.difficulty,
      deadline: assignments.deadline,
      status: assignmentTargets.status,
      assignedAt: assignmentTargets.createdAt,
    })
    .from(assignmentTargets)
    .innerJoin(assignments, eq(assignments.id, assignmentTargets.assignmentId))
    .where(eq(assignmentTargets.participantId, participantId))
    .orderBy(desc(assignmentTargets.createdAt));

  return NextResponse.json({ projects: rows });
}

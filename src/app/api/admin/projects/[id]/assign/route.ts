import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { assignments, assignmentTargets, participants } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";
import { sendAssignmentEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { createNotification } from "@/lib/notifications";

const bodySchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(200),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await db.query.assignments.findFirst({ where: eq(assignments.id, id) });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Select at least one builder" }, { status: 400 });
  }

  const existing = await db.query.assignmentTargets.findMany({
    where: and(
      eq(assignmentTargets.assignmentId, id),
      inArray(assignmentTargets.participantId, parsed.data.participantIds)
    ),
    columns: { participantId: true },
  });
  const alreadyAssigned = new Set(existing.map((e) => e.participantId));
  const newIds = parsed.data.participantIds.filter((pid) => !alreadyAssigned.has(pid));

  if (newIds.length === 0) {
    return NextResponse.json({ assigned: 0, emailed: 0 });
  }

  await db
    .insert(assignmentTargets)
    .values(newIds.map((participantId) => ({ assignmentId: id, participantId })));

  const newParticipants = await db.query.participants.findMany({
    where: inArray(participants.id, newIds),
  });

  let emailed = 0;
  for (const p of newParticipants) {
    try {
      await sendAssignmentEmail(p.email, p.name, {
        title: project.title,
        description: project.description,
        deadline: project.deadline ? project.deadline.toLocaleDateString() : undefined,
        assignmentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/projects/${id}`,
      });
      emailed += 1;
    } catch (err) {
      console.warn(`Assignment email failed for ${p.email} (non-fatal):`, err);
    }
    await logEvent(p.id, "project_assigned", { assignmentId: id });
    await createNotification({
      participantId: p.id,
      type: "project_assigned",
      title: "New project assigned",
      body: project.title,
      linkUrl: `/onboarding/projects/${id}`,
      assignmentId: id,
    });
  }

  await db
    .update(assignmentTargets)
    .set({ emailedAt: new Date() })
    .where(
      and(eq(assignmentTargets.assignmentId, id), inArray(assignmentTargets.participantId, newIds))
    );

  return NextResponse.json({ assigned: newIds.length, emailed });
}

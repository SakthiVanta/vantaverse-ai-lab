import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

const resourceSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  deadline: z.string().datetime().nullable().optional(),
  expectedOutput: z.string().trim().max(1000).nullable().optional(),
  resources: z.array(resourceSchema).max(20).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.query.assignments.findFirst({ where: eq(assignments.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid update" },
      { status: 400 }
    );
  }

  const { deadline, ...rest } = parsed.data;
  const [project] = await db
    .update(assignments)
    .set({
      ...rest,
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
    })
    .where(eq(assignments.id, id))
    .returning();

  return NextResponse.json({ project });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await db.delete(assignments).where(eq(assignments.id, id)).returning();
  if (deleted.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

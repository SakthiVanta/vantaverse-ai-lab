import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { assignments, assignmentTargets } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";

const resourceSchema = z.object({
  type: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
});

const bodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(5000),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  deadline: z.string().datetime().optional().nullable(),
  expectedOutput: z.string().trim().max(1000).optional().nullable(),
  resources: z.array(resourceSchema).max(20).optional(),
});

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // One aggregate query for member counts instead of N+1 per project —
  // matters once there are many projects each with many members.
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      difficulty: assignments.difficulty,
      deadline: assignments.deadline,
      createdAt: assignments.createdAt,
      memberCount: sql<number>`count(${assignmentTargets.id})::int`,
    })
    .from(assignments)
    .leftJoin(assignmentTargets, eq(assignmentTargets.assignmentId, assignments.id))
    .groupBy(assignments.id)
    .orderBy(desc(assignments.createdAt));

  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid project" },
      { status: 400 }
    );
  }

  const [project] = await db
    .insert(assignments)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      difficulty: parsed.data.difficulty,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      expectedOutput: parsed.data.expectedOutput ?? null,
      resources: parsed.data.resources ?? [],
      createdBy: admin.adminId,
    })
    .returning();

  return NextResponse.json({ project });
}

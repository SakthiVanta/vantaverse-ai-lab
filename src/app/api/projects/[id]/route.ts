import { NextResponse } from "next/server";
import { db } from "@/db";
import { assignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await db.query.assignments.findFirst({ where: eq(assignments.id, id) });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project, actor: { type: actor.type, name: actor.name } });
}

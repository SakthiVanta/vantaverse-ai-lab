import { NextResponse } from "next/server";
import { db } from "@/db";
import { researchArticleLikes } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const { id, articleId } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (actor.type !== "participant") {
    return NextResponse.json({ error: "Admin view is read-only here" }, { status: 403 });
  }

  const existing = await db.query.researchArticleLikes.findFirst({
    where: and(
      eq(researchArticleLikes.articleId, articleId),
      eq(researchArticleLikes.participantId, actor.id)
    ),
  });

  if (existing) {
    await db.delete(researchArticleLikes).where(eq(researchArticleLikes.id, existing.id));
  } else {
    await db.insert(researchArticleLikes).values({ articleId, participantId: actor.id });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(researchArticleLikes)
    .where(eq(researchArticleLikes.articleId, articleId));

  return NextResponse.json({ likedByMe: !existing, likeCount: count });
}

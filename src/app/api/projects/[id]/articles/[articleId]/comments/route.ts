import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { researchArticleComments } from "@/db/schema";
import { resolveProjectActor } from "@/lib/project-access";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const { id, articleId } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (actor.type !== "participant") {
    return NextResponse.json({ error: "Admin view is read-only here" }, { status: 403 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(`article-comment:${actor.id}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Slow down a little — try again in ${retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Write something first" }, { status: 400 });
  }

  const [comment] = await db
    .insert(researchArticleComments)
    .values({
      articleId,
      participantId: actor.id,
      authorName: actor.name,
      body: parsed.data.body,
    })
    .returning();

  return NextResponse.json({
    comment: {
      id: comment.id,
      body: comment.body,
      authorName: comment.authorName,
      createdAt: comment.createdAt,
    },
  });
}

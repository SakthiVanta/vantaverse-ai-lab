import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  researchArticles,
  researchArticleLikes,
  researchArticleComments,
} from "@/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; articleId: string }> }
) {
  const { id, articleId } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const article = await db.query.researchArticles.findFirst({
    where: and(eq(researchArticles.id, articleId), eq(researchArticles.assignmentId, id)),
  });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [[{ count: likeCount }], comments, likedByMe] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(researchArticleLikes)
      .where(eq(researchArticleLikes.articleId, articleId)),
    db.query.researchArticleComments.findMany({
      where: eq(researchArticleComments.articleId, articleId),
      orderBy: asc(researchArticleComments.createdAt),
      limit: 200,
    }),
    actor.type === "participant"
      ? db.query.researchArticleLikes.findFirst({
          where: and(
            eq(researchArticleLikes.articleId, articleId),
            eq(researchArticleLikes.participantId, actor.id)
          ),
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    article: {
      id: article.id,
      title: article.title,
      content: article.content,
      authorName: article.authorName,
      createdAt: article.createdAt,
    },
    likeCount,
    likedByMe: !!likedByMe,
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      authorName: c.authorName,
      createdAt: c.createdAt,
    })),
  });
}

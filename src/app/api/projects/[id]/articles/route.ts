import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { researchArticles, researchArticleLikes, researchArticleComments } from "@/db/schema";
import { and, desc, eq, lt, sql, inArray } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/events";

const PAGE_SIZE = 20;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = req.nextUrl.searchParams.get("before");
  const whereClause = before
    ? and(eq(researchArticles.assignmentId, id), lt(researchArticles.createdAt, new Date(before)))
    : eq(researchArticles.assignmentId, id);

  const rows = await db.query.researchArticles.findMany({
    where: whereClause,
    orderBy: desc(researchArticles.createdAt),
    limit: PAGE_SIZE + 1,
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const ids = page.map((a) => a.id);

  // Two aggregate queries (not one per article) for like/comment counts.
  const [likeCounts, commentCounts] = ids.length
    ? await Promise.all([
        db
          .select({ articleId: researchArticleLikes.articleId, count: sql<number>`count(*)::int` })
          .from(researchArticleLikes)
          .where(inArray(researchArticleLikes.articleId, ids))
          .groupBy(researchArticleLikes.articleId),
        db
          .select({ articleId: researchArticleComments.articleId, count: sql<number>`count(*)::int` })
          .from(researchArticleComments)
          .where(inArray(researchArticleComments.articleId, ids))
          .groupBy(researchArticleComments.articleId),
      ])
    : [[], []];
  const likeMap = new Map(likeCounts.map((r) => [r.articleId, r.count]));
  const commentMap = new Map(commentCounts.map((r) => [r.articleId, r.count]));

  return NextResponse.json({
    articles: page.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.content.slice(0, 220),
      authorName: a.authorName,
      createdAt: a.createdAt,
      likeCount: likeMap.get(a.id) ?? 0,
      commentCount: commentMap.get(a.id) ?? 0,
    })),
    hasMore,
  });
}

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (actor.type !== "participant") {
    return NextResponse.json({ error: "Only builders can publish research" }, { status: 403 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(`article-publish:${actor.id}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: `You've published a lot recently — try again in ${Math.ceil(retryAfterSeconds / 60)} min.` },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Add a title and some content" }, { status: 400 });
  }

  const [article] = await db
    .insert(researchArticles)
    .values({
      assignmentId: id,
      authorParticipantId: actor.id,
      authorName: actor.name,
      title: parsed.data.title,
      content: parsed.data.content,
    })
    .returning();

  await logEvent(actor.id, "research_published", { assignmentId: id, articleId: article.id });

  return NextResponse.json({ article });
}

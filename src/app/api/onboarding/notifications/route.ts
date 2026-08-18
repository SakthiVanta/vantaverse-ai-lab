import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getVerifiedParticipantId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;

  const [rows, unreadCountRow] = await Promise.all([
    db.query.notifications.findMany({
      where: eq(notifications.participantId, participantId),
      orderBy: desc(notifications.createdAt),
      limit,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.participantId, participantId), isNull(notifications.readAt))),
  ]);

  return NextResponse.json({
    notifications: rows,
    unreadCount: unreadCountRow[0]?.count ?? 0,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { projectMessages, assignments } from "@/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";
import { resolveProjectActor } from "@/lib/project-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { getProjectParticipantMembers } from "@/lib/project-members";
import { extractMentionedNames } from "@/lib/mentions";
import { createNotification } from "@/lib/notifications";

const PAGE_SIZE = 50;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = req.nextUrl.searchParams.get("before");
  const whereClause = before
    ? and(eq(projectMessages.assignmentId, id), lt(projectMessages.createdAt, new Date(before)))
    : eq(projectMessages.assignmentId, id);

  // Fetch newest-first (cheap with the (assignmentId, createdAt) index),
  // then reverse for chronological display — this is how "load older
  // messages on scroll-up" pagination stays fast no matter how long the
  // channel's history gets.
  const rows = await db.query.projectMessages.findMany({
    where: whereClause,
    orderBy: desc(projectMessages.createdAt),
    limit: PAGE_SIZE + 1,
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE).reverse();

  return NextResponse.json({
    messages: page.map((m) => ({
      id: m.id,
      body: m.body,
      senderName: m.senderName,
      senderRole: m.senderRole,
      senderEmoji: m.senderEmoji,
      isMe:
        (actor.type === "participant" && m.senderParticipantId === actor.id) ||
        (actor.type === "admin" && m.senderAdminId === actor.id),
      createdAt: m.createdAt,
    })),
    hasMore,
  });
}

const bodySchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const actor = await resolveProjectActor(id);
  if (!actor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { allowed, retryAfterSeconds } = checkRateLimit(
    `project-chat:${actor.type}:${actor.id}`,
    20,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Slow down a little — try again in ${retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Say something first" }, { status: 400 });
  }

  const [message] = await db
    .insert(projectMessages)
    .values({
      assignmentId: id,
      senderParticipantId: actor.type === "participant" ? actor.id : null,
      senderAdminId: actor.type === "admin" ? actor.id : null,
      senderName: actor.name,
      senderRole: actor.type,
      senderEmoji: actor.emoji,
      body: parsed.data.body,
    })
    .returning();

  // Notify anyone actually @mentioned in this message (not every member —
  // a busy project chat would otherwise spam everyone on every message).
  const members = await getProjectParticipantMembers(id);
  const mentionedNames = extractMentionedNames(
    parsed.data.body,
    members.map((m) => m.name)
  );
  if (mentionedNames.length > 0) {
    const project = await db.query.assignments.findFirst({ where: eq(assignments.id, id) });
    const mentionedMembers = members.filter(
      (m) => mentionedNames.includes(m.name) && m.id !== (actor.type === "participant" ? actor.id : null)
    );
    for (const member of mentionedMembers) {
      await createNotification({
        participantId: member.id,
        type: "project_mentioned",
        title: `${actor.name} mentioned you`,
        body: project ? `In "${project.title}": ${parsed.data.body}`.slice(0, 200) : parsed.data.body.slice(0, 200),
        linkUrl: `/onboarding/projects/${id}`,
        assignmentId: id,
        sourceMessageId: message.id,
      });
    }
  }

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      senderName: message.senderName,
      senderRole: message.senderRole,
      senderEmoji: message.senderEmoji,
      isMe: true,
      createdAt: message.createdAt,
    },
  });
}

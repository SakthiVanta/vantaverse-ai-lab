import { db } from "@/db";
import { assignmentTargets, participants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentAdmin, getVerifiedParticipantId } from "@/lib/auth";

export type ProjectActor =
  | { type: "participant"; id: string; name: string }
  | { type: "admin"; id: string; name: string };

/**
 * Resolves who's allowed to act inside a project (chat, research module):
 * an admin can access every project; a participant only one they've been
 * assigned to. Centralized here so every project sub-resource route
 * (messages, articles, comments, likes) enforces the same rule instead of
 * each re-implementing it slightly differently.
 */
export async function resolveProjectActor(assignmentId: string): Promise<ProjectActor | null> {
  const admin = await getCurrentAdmin();
  if (admin) {
    return { type: "admin", id: admin.adminId, name: "Vantaverse Admin" };
  }

  const participantId = await getVerifiedParticipantId();
  if (!participantId) return null;

  const membership = await db.query.assignmentTargets.findFirst({
    where: and(
      eq(assignmentTargets.assignmentId, assignmentId),
      eq(assignmentTargets.participantId, participantId)
    ),
  });
  if (!membership) return null;

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
    columns: { name: true },
  });
  return { type: "participant", id: participantId, name: participant?.name ?? "Builder" };
}

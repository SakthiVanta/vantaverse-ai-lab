import { db } from "@/db";
import { assignmentTargets, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSpiritById } from "@/lib/spirits";

export type ProjectMember = {
  id: string;
  name: string;
  emoji: string;
  isAdminAlias: boolean;
};

/** Real participant members of a project (assignment), joined with their
 * spirit emoji. Does not include the synthetic "admin" pseudo-member —
 * callers that need that for display (chat mention list) add it themselves. */
export async function getProjectParticipantMembers(assignmentId: string): Promise<ProjectMember[]> {
  const rows = await db
    .select({ id: participants.id, name: participants.name, spiritId: participants.spiritId })
    .from(assignmentTargets)
    .innerJoin(participants, eq(participants.id, assignmentTargets.participantId))
    .where(eq(assignmentTargets.assignmentId, assignmentId));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.spiritId ? (getSpiritById(r.spiritId)?.emoji ?? "👤") : "👤",
    isAdminAlias: false,
  }));
}

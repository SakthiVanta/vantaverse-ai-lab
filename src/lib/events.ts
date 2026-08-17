import { db } from "@/db";
import { events } from "@/db/schema";

export async function logEvent(
  participantId: string,
  type: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(events).values({ participantId, type, metadata });
}

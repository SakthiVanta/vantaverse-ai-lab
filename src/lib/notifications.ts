import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function createNotification(params: {
  participantId: string;
  type: "project_assigned" | "project_mentioned";
  title: string;
  body?: string;
  linkUrl?: string;
  assignmentId?: string;
  sourceMessageId?: string;
}) {
  await db.insert(notifications).values(params);
}

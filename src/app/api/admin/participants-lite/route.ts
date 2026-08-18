import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";

/** Minimal participant list for admin pickers (e.g. assigning builders to
 * a project) — just id/name/email, not the full dashboard row set. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ id: participants.id, name: participants.name, email: participants.email })
    .from(participants)
    .orderBy(asc(participants.name));

  return NextResponse.json({ participants: rows });
}

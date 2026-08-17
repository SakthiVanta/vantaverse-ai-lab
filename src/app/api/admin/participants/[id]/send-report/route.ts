import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants, aiAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendBuilderReportEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, id),
  });
  const analysis = await db.query.aiAnalyses.findFirst({
    where: eq(aiAnalyses.participantId, id),
  });

  if (!participant || !analysis) {
    return NextResponse.json({ error: "Run analysis first" }, { status: 400 });
  }

  try {
    await sendBuilderReportEmail(participant.email, participant.name, {
      archetype: analysis.primaryArchetype,
      summary: analysis.githubSummary || (analysis.strengthSignals as string[])[0] || "",
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/complete`,
    });
    await logEvent(id, "report_emailed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email failed" },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants, aiAnalyses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendBuilderReportEmail } from "@/lib/email";
import { logEvent } from "@/lib/events";
import { signReportAccessToken } from "@/lib/auth";
import { buildReportSummary } from "@/lib/report";

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
    const token = await signReportAccessToken(id);
    await sendBuilderReportEmail(participant.email, participant.name, {
      archetype: analysis.primaryArchetype,
      summary: buildReportSummary({
        githubSummary: analysis.githubSummary,
        strengthSignals: analysis.strengthSignals as string[],
      }),
      cardImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/builder-card/${id}`,
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/complete?token=${token}`,
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

import { NextResponse } from "next/server";
import { runAndSaveAnalysis } from "@/lib/analysis";
import { sendBuilderReportForParticipant } from "@/lib/report";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Admin runs always use the env fallback key, regardless of whether the
    // builder has their own — this is the "admin unlocks it for them" path,
    // so the follow-up email is unconditional too.
    const analysis = await runAndSaveAnalysis(id, "admin");

    let emailed = true;
    let emailError: string | null = null;
    try {
      await sendBuilderReportForParticipant(id);
    } catch (err) {
      emailed = false;
      emailError = err instanceof Error ? err.message : "Email failed";
      console.warn("Auto-email after admin analysis failed (non-fatal):", err);
    }

    return NextResponse.json({ ok: true, analysis, emailed, emailError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { runAndSaveAnalysis } from "@/lib/analysis";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const analysis = await runAndSaveAnalysis(id);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

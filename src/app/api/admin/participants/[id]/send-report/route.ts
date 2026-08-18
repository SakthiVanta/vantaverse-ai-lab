import { NextResponse } from "next/server";
import { sendBuilderReportForParticipant } from "@/lib/report";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sendBuilderReportForParticipant(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Email failed" },
      { status: 502 }
    );
  }
}

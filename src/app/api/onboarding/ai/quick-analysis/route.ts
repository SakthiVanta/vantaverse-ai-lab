import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedParticipantId } from "@/lib/auth";
import { requireOwnKey, MissingKeyError } from "@/lib/ai-key";
import { askGemini } from "@/lib/gemini";
import { buildParticipantContext } from "@/lib/ai-context";
import { getQuickAnalysis } from "@/lib/quick-analyses";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/events";

const bodySchema = z.object({ kind: z.string() });

export async function POST(req: NextRequest) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(
    `ai-quick:${participantId}`,
    10,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Slow down a little — try again in ${retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  const preset = parsed.success ? getQuickAnalysis(parsed.data.kind) : undefined;
  if (!preset) {
    return NextResponse.json({ error: "Unknown analysis type" }, { status: 400 });
  }

  try {
    const [apiKey, context] = await Promise.all([
      requireOwnKey(participantId),
      buildParticipantContext(participantId),
    ]);
    const reply = await askGemini(apiKey, preset.prompt, [], context);
    await logEvent(participantId, "quick_analysis_run", { kind: preset.kind });
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The assistant is unavailable right now" },
      { status: 502 }
    );
  }
}

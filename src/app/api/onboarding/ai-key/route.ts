import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedParticipantId } from "@/lib/auth";
import { saveOwnKey, removeOwnKey, getOwnKeyStatus } from "@/lib/ai-key";
import { validateGeminiKey } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/events";

export async function GET() {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  const status = await getOwnKeyStatus(participantId);
  return NextResponse.json(status);
}

const bodySchema = z.object({ apiKey: z.string().trim().min(10).max(200) });

export async function POST(req: NextRequest) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(
    `ai-key-save:${participantId}`,
    5,
    10 * 60 * 1000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} min.` },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid API key" }, { status: 400 });
  }

  try {
    await validateGeminiKey(parsed.data.apiKey);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't verify that key" },
      { status: 400 }
    );
  }

  await saveOwnKey(participantId, parsed.data.apiKey);
  await logEvent(participantId, "ai_key_saved");

  const status = await getOwnKeyStatus(participantId);
  return NextResponse.json({ ok: true, ...status });
}

export async function DELETE() {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
  await removeOwnKey(participantId);
  await logEvent(participantId, "ai_key_removed");
  return NextResponse.json({ ok: true });
}

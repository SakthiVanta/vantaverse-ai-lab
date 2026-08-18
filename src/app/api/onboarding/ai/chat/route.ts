import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedParticipantId } from "@/lib/auth";
import { requireOwnKey, MissingKeyError } from "@/lib/ai-key";
import { askGemini, type ChatMessage } from "@/lib/gemini";
import { buildParticipantContext } from "@/lib/ai-context";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().max(4000),
      })
    )
    .max(20)
    .optional(),
});

export async function POST(req: NextRequest) {
  const participantId = await getVerifiedParticipantId();
  if (!participantId) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const { allowed, retryAfterSeconds } = checkRateLimit(`ai-chat:${participantId}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: `Slow down a little — try again in ${retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Say something first" }, { status: 400 });
  }

  try {
    const [apiKey, context] = await Promise.all([
      requireOwnKey(participantId),
      buildParticipantContext(participantId),
    ]);
    const reply = await askGemini(
      apiKey,
      parsed.data.message,
      (parsed.data.history as ChatMessage[] | undefined) ?? [],
      context
    );
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

import { db } from "@/db";
import { participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";

export type KeySource = "own" | "admin_fallback";

export class MissingKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingKeyError";
  }
}

export async function saveOwnKey(participantId: string, apiKey: string) {
  await db
    .update(participants)
    .set({
      aiApiKeyEncrypted: encryptSecret(apiKey),
      aiApiKeyLast4: maskSecret(apiKey),
      aiApiKeySetAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId));
}

export async function removeOwnKey(participantId: string) {
  await db
    .update(participants)
    .set({
      aiApiKeyEncrypted: null,
      aiApiKeyLast4: null,
      aiApiKeySetAt: null,
      updatedAt: new Date(),
    })
    .where(eq(participants.id, participantId));
}

export async function getOwnKeyStatus(
  participantId: string
): Promise<{ hasKey: boolean; last4: string | null }> {
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
    columns: { aiApiKeyEncrypted: true, aiApiKeyLast4: true },
  });
  return {
    hasKey: !!participant?.aiApiKeyEncrypted,
    last4: participant?.aiApiKeyLast4 ?? null,
  };
}

/** Decrypts and returns the participant's own key, or throws MissingKeyError. */
export async function requireOwnKey(participantId: string): Promise<string> {
  const participant = await db.query.participants.findFirst({
    where: eq(participants.id, participantId),
    columns: { aiApiKeyEncrypted: true },
  });
  if (!participant?.aiApiKeyEncrypted) {
    throw new MissingKeyError("Add your own AI key in your Profile to unlock this.");
  }
  return decryptSecret(participant.aiApiKeyEncrypted);
}

/** The admin-only fallback key from the environment. Never used for
 * participant self-service — only when an admin manually runs analysis
 * for someone who hasn't added their own key. */
export function requireAdminFallbackKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new MissingKeyError(
      "No admin fallback AI key configured — set GEMINI_API_KEY in .env."
    );
  }
  return key;
}

export async function resolveAnalysisKey(
  participantId: string,
  triggeredBy: "self" | "admin"
): Promise<{ apiKey: string; keySource: KeySource }> {
  if (triggeredBy === "self") {
    return { apiKey: await requireOwnKey(participantId), keySource: "own" };
  }
  return { apiKey: requireAdminFallbackKey(), keySource: "admin_fallback" };
}

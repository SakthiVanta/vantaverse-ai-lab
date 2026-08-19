import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { SIGNAL_DIMENSIONS } from "./signals";

export const analysisSchema = z.object({
  builder_identity: z.object({
    primary_archetype: z.string().min(1),
    secondary_archetype: z.string().min(1).optional().nullable(),
  }),
  signals: z.object(
    Object.fromEntries(
      SIGNAL_DIMENSIONS.map((d) => [d, z.number().min(0).max(100)])
    ) as Record<(typeof SIGNAL_DIMENSIONS)[number], z.ZodNumber>
  ),
  strength_signals: z.array(z.string()).min(1),
  growth_signals: z.array(z.string()).min(1),
  interests: z.array(z.string()),
  github_summary: z.string().optional().nullable().default(""),
  evidence: z
    .array(
      z.object({
        observation: z.string(),
        evidence: z.string(),
      })
    )
    .min(1),
  confidence: z.enum(["low", "medium", "high"]),
});

export type BuilderAnalysis = z.infer<typeof analysisSchema>;

export type GithubEvidence = {
  username: string;
  languageBreakdown: Record<string, number>;
  projectThemes: string[];
  activitySignal: string;
  aiProjectEvidence: string;
  repoCount: number;
  commitContributionsLastYear: number;
  reposContributedToLastYear: number;
  openSourceContribution: string;
};

export type AnalysisInput = {
  name: string;
  challengeResponses: {
    challengeKey: string;
    response: unknown;
    reasoning?: string | null;
  }[];
  problem?: { description: string; who: string; why: string } | null;
  github?: GithubEvidence | null;
};

function formatGithubEvidence(github: GithubEvidence): string {
  return `GitHub evidence:
- username: ${github.username}
- public repositories analyzed: ${github.repoCount} (owned, non-fork)
- languages (byte-weighted across all repos): ${JSON.stringify(github.languageBreakdown)}
- project themes: ${github.projectThemes.join(", ") || "none detected"}
- activity signal (recency of pushes): ${github.activitySignal}
- AI project evidence: ${github.aiProjectEvidence}
- commit contributions in the last ~year (across ALL public repos, owned or not): ${github.commitContributionsLastYear}
- distinct repos contributed to in the last ~year: ${github.reposContributedToLastYear}
- open-source contribution signal: ${github.openSourceContribution}`;
}

export function buildAnalysisPrompt(input: AnalysisInput): string {
  const githubBlock = input.github
    ? formatGithubEvidence(input.github)
    : "GitHub evidence: not connected. Do not penalize the participant for this — simply note limited evidence where relevant.";

  return `You are the Builder Intelligence engine for Vantaverse AI Builder Lab.

You analyze a participant's behavioral challenge responses and their public GitHub building history to produce a Builder Profile. This is NOT a psychological or clinical assessment — it is a set of behavioral/team-building signals, evidence-based and non-judgmental. Never claim to know who the person "is" — only what the evidence so far suggests.

Participant name: ${input.name}

Challenge responses (situation → choice/response → reasoning):
${input.challengeResponses
  .map(
    (r) =>
      `- [${r.challengeKey}] response: ${JSON.stringify(r.response)}${
        r.reasoning ? ` | reasoning: "${r.reasoning}"` : ""
      }`
  )
  .join("\n")}

${input.problem ? `Problem they'd fix: "${input.problem.description}" — who: "${input.problem.who}" — why it matters: "${input.problem.why}"` : ""}

${githubBlock}

Write "github_summary" the way GitHub's own year-in-review ("your GitHub says about you") talks to a builder: second person, punchy, specific — name real numbers and repos/languages from the evidence above rather than generic praise. Two to four sentences. If GitHub isn't connected, say so in one plain sentence instead.

Return ONLY valid JSON matching this exact shape (no markdown fences, no commentary):
{
  "builder_identity": { "primary_archetype": string, "secondary_archetype": string },
  "signals": { ${SIGNAL_DIMENSIONS.map((d) => `"${d}": number (0-100)`).join(", ")} },
  "strength_signals": string[],
  "growth_signals": string[],
  "interests": string[],
  "github_summary": string,
  "evidence": [ { "observation": string, "evidence": string } ],
  "confidence": "low" | "medium" | "high"
}

Every entry in strength_signals and growth_signals must be traceable to at least one item in "evidence". Ground every claim in what was actually said or built — do not invent details.`;
}

export function parseAnalysisResponse(raw: string): BuilderAnalysis {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "");
  const json = JSON.parse(cleaned);
  return analysisSchema.parse(json);
}

function resolveModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

export function buildGithubNarrativePrompt(name: string, github: GithubEvidence): string {
  return `You are the Builder Intelligence engine for Vantaverse AI Builder Lab.

Write a short "your GitHub says about you" narrative for ${name} — the way GitHub's own year-in-review talks to a builder: second person, punchy, specific. Three to five sentences. Name real numbers, languages, and themes from the evidence below rather than generic praise. If the evidence is genuinely thin, say so plainly and encouragingly rather than inflating it.

${formatGithubEvidence(github)}

Return ONLY the narrative text — no JSON, no markdown fences, no headings, no quotation marks around it.`;
}

/** GitHub-only AI narrative — admin-triggered, independent of the full
 * behavioral analysis (which requires challenge responses too). Always
 * uses the admin fallback key. */
export async function runGithubNarrative(apiKey: string, name: string, github: GithubEvidence): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: resolveModelName() });
  const prompt = buildGithubNarrativePrompt(name, github);
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Runs the structured Builder Analysis. `apiKey` is always required and
 * always caller-supplied — either the participant's own key or, for
 * admin-triggered runs, the operator's env fallback key. There is no
 * silent env fallback here: callers decide which key applies.
 */
export async function runBuilderAnalysis(
  input: AnalysisInput,
  apiKey: string
): Promise<{ analysis: BuilderAnalysis; model: string; raw: string }> {
  const modelName = resolveModelName();

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = buildAnalysisPrompt(input);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return { analysis: parseAnalysisResponse(text), model: modelName, raw: text };
}

/** Throws a short, user-facing message if the key is missing/invalid —
 * used both to validate a key the moment a builder saves it, and to give
 * a clean error instead of a raw SDK exception at call time. */
export async function validateGeminiKey(apiKey: string): Promise<void> {
  if (!apiKey.trim()) {
    throw new Error("Enter an API key first.");
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: resolveModelName() });
    await model.generateContent("Reply with the single word: ok");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/api key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
      throw new Error("That key doesn't look valid — check it and try again.");
    }
    throw new Error("Couldn't reach Gemini with that key. Try again in a moment.");
  }
}

export type ChatMessage = { role: "user" | "model"; text: string };

const CHAT_SYSTEM_PROMPT = `You are the Vantaverse AI Builder Lab assistant. You help a Founding Builder think about their own building journey — their GitHub activity, their onboarding challenge answers, their project ideas, and what to build next. Be direct, specific, and encouraging without being generic. Keep replies conversational and concise (a few short paragraphs at most, or a tight list) unless the builder clearly asks for depth. If asked something with no connection to building, learning, or this program, gently redirect.`;

/** Freeform chat + the "quick analysis" preset prompts both go through
 * this — a single-turn-aware call using the builder's own key. */
export async function askGemini(
  apiKey: string,
  message: string,
  history: ChatMessage[] = [],
  context?: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: resolveModelName(),
    systemInstruction: context
      ? `${CHAT_SYSTEM_PROMPT}\n\nContext about this builder:\n${context}`
      : CHAT_SYSTEM_PROMPT,
  });

  const chat = model.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
  });
  const result = await chat.sendMessage(message);
  return result.response.text();
}

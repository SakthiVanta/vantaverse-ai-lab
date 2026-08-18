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

export type AnalysisInput = {
  name: string;
  challengeResponses: {
    challengeKey: string;
    response: unknown;
    reasoning?: string | null;
  }[];
  problem?: { description: string; who: string; why: string } | null;
  github?: {
    username: string;
    languageBreakdown: Record<string, number>;
    projectThemes: string[];
    activitySignal: string;
    aiProjectEvidence: string;
    repoCount: number;
    commitContributionsLastYear: number;
    reposContributedToLastYear: number;
    openSourceContribution: string;
  } | null;
};

export function buildAnalysisPrompt(input: AnalysisInput): string {
  const githubBlock = input.github
    ? `GitHub evidence:
- username: ${input.github.username}
- public repositories analyzed: ${input.github.repoCount} (owned, non-fork)
- languages (byte-weighted across all repos): ${JSON.stringify(input.github.languageBreakdown)}
- project themes: ${input.github.projectThemes.join(", ") || "none detected"}
- activity signal (recency of pushes): ${input.github.activitySignal}
- AI project evidence: ${input.github.aiProjectEvidence}
- commit contributions in the last ~year (across ALL public repos, owned or not): ${input.github.commitContributionsLastYear}
- distinct repos contributed to in the last ~year: ${input.github.reposContributedToLastYear}
- open-source contribution signal: ${input.github.openSourceContribution}`
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

export async function runBuilderAnalysis(
  input: AnalysisInput
): Promise<{ analysis: BuilderAnalysis; model: string; raw: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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

import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt, parseAnalysisResponse } from "./gemini";
import { SIGNAL_DIMENSIONS } from "./signals";

function validAnalysisJson() {
  return {
    builder_identity: {
      primary_archetype: "The Experimenter",
      secondary_archetype: "The Problem Hunter",
    },
    signals: Object.fromEntries(SIGNAL_DIMENSIONS.map((d) => [d, 70])),
    strength_signals: ["Strong problem-discovery orientation."],
    growth_signals: ["Could lean further into rapid execution."],
    interests: ["AI Agents"],
    github_summary: "Active TypeScript builder with recent AI experiments.",
    evidence: [
      {
        observation: "Strong problem-discovery orientation.",
        evidence: "Prioritized understanding the user before building.",
      },
    ],
    confidence: "medium",
  };
}

describe("parseAnalysisResponse", () => {
  it("parses clean JSON matching the schema", () => {
    const analysis = parseAnalysisResponse(JSON.stringify(validAnalysisJson()));
    expect(analysis.builder_identity.primary_archetype).toBe("The Experimenter");
    expect(analysis.signals.exploration).toBe(70);
  });

  it("strips markdown code fences before parsing", () => {
    const wrapped = "```json\n" + JSON.stringify(validAnalysisJson()) + "\n```";
    const analysis = parseAnalysisResponse(wrapped);
    expect(analysis.confidence).toBe("medium");
  });

  it("throws when a signal is out of the 0-100 range", () => {
    const bad = validAnalysisJson();
    bad.signals.exploration = 150;
    expect(() => parseAnalysisResponse(JSON.stringify(bad))).toThrow();
  });

  it("throws when evidence array is empty", () => {
    const bad = validAnalysisJson();
    bad.evidence = [];
    expect(() => parseAnalysisResponse(JSON.stringify(bad))).toThrow();
  });

  it("throws when confidence is not one of the allowed values", () => {
    const bad = validAnalysisJson() as Record<string, unknown>;
    bad.confidence = "certain";
    expect(() => parseAnalysisResponse(JSON.stringify(bad))).toThrow();
  });

  it("throws on malformed JSON", () => {
    expect(() => parseAnalysisResponse("{not json")).toThrow();
  });
});

describe("buildAnalysisPrompt", () => {
  it("includes the participant name and challenge responses", () => {
    const prompt = buildAnalysisPrompt({
      name: "Sakthi",
      challengeResponses: [
        { challengeKey: "the_unknown", response: { choice: "talk" }, reasoning: "I'd rather validate first" },
      ],
    });
    expect(prompt).toContain("Sakthi");
    expect(prompt).toContain("the_unknown");
    expect(prompt).toContain("validate first");
  });

  it("notes limited evidence without penalizing when GitHub is not connected", () => {
    const prompt = buildAnalysisPrompt({ name: "Sakthi", challengeResponses: [] });
    expect(prompt).toContain("not connected");
    expect(prompt).toContain("Do not penalize");
  });

  it("includes GitHub evidence block when github data is present", () => {
    const prompt = buildAnalysisPrompt({
      name: "Sakthi",
      challengeResponses: [],
      github: {
        username: "sakthi-dev",
        languageBreakdown: { TypeScript: 60, Python: 40 },
        projectThemes: ["AI", "Web Apps"],
        activitySignal: "High",
        aiProjectEvidence: "Strong",
        repoCount: 5,
      },
    });
    expect(prompt).toContain("sakthi-dev");
    expect(prompt).toContain("Strong");
  });
});

export type QuickAnalysisKind =
  | "github_performance"
  | "project_flow"
  | "next_steps"
  | "strengths_gaps";

export const QUICK_ANALYSES: {
  kind: QuickAnalysisKind;
  label: string;
  description: string;
  prompt: string;
}[] = [
  {
    kind: "github_performance",
    label: "Analyze my GitHub performance",
    description: "Languages, activity, and what your repos say about how you build.",
    prompt:
      "Analyze my GitHub performance using the context you have on me — languages, activity signal, open-source contribution, and project themes. Be specific about what the evidence actually shows, not generic advice.",
  },
  {
    kind: "project_flow",
    label: "Analyze my Vantaverse journey",
    description: "How your onboarding signals and interests connect into a direction.",
    prompt:
      "Look at my Builder archetype, strengths, growth areas, and the problem I said I'd fix. Walk me through how these connect — what's the throughline in how I think and what I'm drawn to build?",
  },
  {
    kind: "next_steps",
    label: "What should I build next?",
    description: "A concrete suggestion grounded in your interests and skills.",
    prompt:
      "Based on what you know about me — my languages, interests, and the problem I care about — suggest one concrete project I could start this week. Be specific, not generic.",
  },
  {
    kind: "strengths_gaps",
    label: "My strengths and blind spots",
    description: "An honest read on what to lean into and what to watch for.",
    prompt:
      "Give me an honest, evidence-based read on my strengths and likely blind spots as a builder, based on everything you know about me. Don't soften it — I want it useful.",
  },
];

export function getQuickAnalysis(kind: string) {
  return QUICK_ANALYSES.find((q) => q.kind === kind);
}

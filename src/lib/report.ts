/** The one-line summary shown in the Builder Report email. */
export function buildReportSummary(input: {
  githubSummary?: string | null;
  strengthSignals: string[];
}): string {
  return input.githubSummary?.trim() || input.strengthSignals[0] || "";
}

/** A lightweight "first Vantaverse direction" line derived from the analysis. */
export function buildFirstDirection(input: {
  interests: string[];
  primaryArchetype: string;
}): string {
  const topInterest = input.interests[0];
  if (!topInterest) {
    return `Keep building — your next challenge will sharpen what makes you ${input.primaryArchetype}.`;
  }
  return `Start close to ${topInterest} — it's where your signals are already pointing, and it's the fastest path to your next Vantaverse challenge.`;
}

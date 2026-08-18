import { db } from "@/db";
import { participants, githubProfiles, aiAnalyses, problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { countOwnedNonForkRepos } from "@/lib/github-summary";

/** A compact text summary of what we know about a participant, used as
 * grounding context for the chat assistant and quick-analysis prompts —
 * not the full structured analysis input (that's buildAnalysisInput). */
export async function buildParticipantContext(participantId: string): Promise<string> {
  const [participant, github, analysis, problem] = await Promise.all([
    db.query.participants.findFirst({ where: eq(participants.id, participantId) }),
    db.query.githubProfiles.findFirst({ where: eq(githubProfiles.participantId, participantId) }),
    db.query.aiAnalyses.findFirst({ where: eq(aiAnalyses.participantId, participantId) }),
    db.query.problems.findFirst({ where: eq(problems.participantId, participantId) }),
  ]);

  if (!participant) return "";

  const lines: string[] = [`Name: ${participant.name}`, `Spirit: ${participant.spiritId ?? "not chosen yet"}`];

  if (github) {
    lines.push(
      `GitHub: @${github.username}, ${countOwnedNonForkRepos(github.repositories)} owned repos analyzed, ` +
        `languages ${JSON.stringify(github.languageBreakdown ?? {})}, ` +
        `activity: ${github.activitySignal}, AI project evidence: ${github.aiProjectEvidence}, ` +
        `open-source contribution: ${github.openSourceContribution ?? "unknown"}, ` +
        `${github.commitContributionsLastYear ?? 0} commit contributions in the last year across ` +
        `${github.reposContributedToLastYear ?? 0} repos.`
    );
  } else {
    lines.push("GitHub: not connected.");
  }

  if (analysis) {
    lines.push(
      `Builder archetype: ${analysis.primaryArchetype}${
        analysis.secondaryArchetype ? ` (secondary: ${analysis.secondaryArchetype})` : ""
      }.`,
      `Strengths: ${(analysis.strengthSignals as string[]).join("; ")}`,
      `Growth areas: ${(analysis.growthSignals as string[]).join("; ")}`,
      `Interests: ${(analysis.interests as string[]).join(", ")}`
    );
  }

  if (problem) {
    lines.push(`Problem they said they'd fix: "${problem.description}" (for: ${problem.whoExperiencesIt}).`);
  }

  return lines.join("\n");
}

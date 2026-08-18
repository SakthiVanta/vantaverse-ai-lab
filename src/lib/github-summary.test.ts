import { describe, it, expect } from "vitest";
import {
  summarizeGithubActivity,
  deriveContributionSignal,
  countOwnedNonForkRepos,
  type GithubRepoInput,
} from "./github-summary";

const NOW = new Date("2026-08-17T00:00:00Z");

function repo(overrides: Partial<GithubRepoInput>): GithubRepoInput {
  return {
    name: "repo",
    description: null,
    languages: [],
    stargazersCount: 0,
    forksCount: 0,
    topics: [],
    pushedAt: NOW.toISOString(),
    fork: false,
    archived: false,
    ...overrides,
  };
}

function lang(name: string, bytes: number) {
  return [{ name, bytes }];
}

describe("summarizeGithubActivity", () => {
  it("returns an empty/limited summary for no repos", () => {
    const summary = summarizeGithubActivity([], NOW);
    expect(summary.repoCount).toBe(0);
    expect(summary.activitySignal).toBe("None");
    expect(summary.aiProjectEvidence).toBe("Limited");
    expect(summary.projectThemes).toEqual([]);
  });

  it("excludes forked and archived repos from the count", () => {
    const repos = [
      repo({ name: "mine", languages: lang("TypeScript", 1000) }),
      repo({ name: "forked", fork: true, languages: lang("TypeScript", 1000) }),
      repo({ name: "old", archived: true, languages: lang("TypeScript", 1000) }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.repoCount).toBe(1);
  });

  it("computes language breakdown as byte-weighted percentages across repos", () => {
    const repos = [
      repo({ name: "a", languages: lang("TypeScript", 6000) }),
      repo({ name: "b", languages: [{ name: "TypeScript", bytes: 4000 }] }),
      repo({ name: "c", languages: lang("Python", 5000) }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.languageBreakdown.TypeScript).toBe(67);
    expect(summary.languageBreakdown.Python).toBe(33);
  });

  it("weights a large repo's language more than a tiny repo's, unlike a repo-count average", () => {
    const repos = [
      // A 50-line script shouldn't count the same as a 50,000-line app.
      repo({ name: "tiny-script", languages: lang("Shell", 50) }),
      repo({ name: "big-app", languages: lang("TypeScript", 50000) }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.languageBreakdown.TypeScript).toBeGreaterThan(95);
    expect(summary.languageBreakdown.Shell ?? 0).toBeLessThan(5);
  });

  it("detects AI theme from repo name/description/topics", () => {
    const repos = [
      repo({ name: "my-ai-agent", description: "An LLM agent framework" }),
      repo({ name: "rag-pipeline", topics: ["rag", "llm"] }),
      repo({ name: "chatbot-app", description: "A gemini-powered chatbot" }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.projectThemes).toContain("AI");
    expect(summary.aiProjectEvidence).toBe("Strong");
  });

  it("reports Limited AI evidence when no AI-themed repos exist", () => {
    const repos = [repo({ name: "todo-app", description: "A simple todo list" })];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.aiProjectEvidence).toBe("Limited");
  });

  it("reports High activity when several repos pushed recently", () => {
    const repos = [
      repo({ name: "a", pushedAt: NOW.toISOString() }),
      repo({ name: "b", pushedAt: NOW.toISOString() }),
      repo({ name: "c", pushedAt: NOW.toISOString() }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.activitySignal).toBe("High");
  });

  it("reports Low activity when nothing was pushed in the last 90 days", () => {
    const longAgo = new Date(NOW.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString();
    const repos = [repo({ name: "a", pushedAt: longAgo })];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.activitySignal).toBe("Low");
  });

  it("derives project diversity from the number of distinct themes", () => {
    const repos = [
      repo({ name: "ai-thing", description: "an ai agent" }),
      repo({ name: "my-web-app", description: "a nextjs frontend" }),
      repo({ name: "cli-tool", description: "a devtools extension" }),
      repo({ name: "data-dash", description: "a data analytics dashboard" }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.projectDiversity).toBe("High");
  });
});

describe("countOwnedNonForkRepos", () => {
  it("counts only non-fork, non-archived entries", () => {
    const repos = [
      { fork: false, archived: false },
      { fork: true, archived: false },
      { fork: false, archived: true },
      { fork: false, archived: false },
    ];
    expect(countOwnedNonForkRepos(repos)).toBe(2);
  });

  it("returns 0 for non-array input (e.g. null from an unset jsonb column)", () => {
    expect(countOwnedNonForkRepos(null)).toBe(0);
    expect(countOwnedNonForkRepos(undefined)).toBe(0);
  });
});

describe("deriveContributionSignal", () => {
  it("reports Strong for high commit volume", () => {
    expect(
      deriveContributionSignal({
        totalCommitContributions: 250,
        totalRepositoriesWithContributedCommits: 1,
      })
    ).toBe("Strong");
  });

  it("reports Strong for contributions spread across many repos even with fewer commits", () => {
    expect(
      deriveContributionSignal({
        totalCommitContributions: 20,
        totalRepositoriesWithContributedCommits: 6,
      })
    ).toBe("Strong");
  });

  it("reports Moderate for modest activity", () => {
    expect(
      deriveContributionSignal({
        totalCommitContributions: 40,
        totalRepositoriesWithContributedCommits: 1,
      })
    ).toBe("Moderate");
  });

  it("reports Limited for little to no activity", () => {
    expect(
      deriveContributionSignal({
        totalCommitContributions: 2,
        totalRepositoriesWithContributedCommits: 1,
      })
    ).toBe("Limited");
  });
});

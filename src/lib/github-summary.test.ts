import { describe, it, expect } from "vitest";
import { summarizeGithubActivity, type GithubRepoInput } from "./github-summary";

const NOW = new Date("2026-08-17T00:00:00Z");

function repo(overrides: Partial<GithubRepoInput>): GithubRepoInput {
  return {
    name: "repo",
    description: null,
    language: null,
    stargazersCount: 0,
    forksCount: 0,
    topics: [],
    pushedAt: NOW.toISOString(),
    fork: false,
    archived: false,
    ...overrides,
  };
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
      repo({ name: "mine", language: "TypeScript" }),
      repo({ name: "forked", fork: true, language: "TypeScript" }),
      repo({ name: "old", archived: true, language: "TypeScript" }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.repoCount).toBe(1);
  });

  it("computes language breakdown as percentages across repos with a language", () => {
    const repos = [
      repo({ name: "a", language: "TypeScript" }),
      repo({ name: "b", language: "TypeScript" }),
      repo({ name: "c", language: "Python" }),
    ];
    const summary = summarizeGithubActivity(repos, NOW);
    expect(summary.languageBreakdown.TypeScript).toBe(67);
    expect(summary.languageBreakdown.Python).toBe(33);
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

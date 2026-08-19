export type GithubRepoInput = {
  name: string;
  description: string | null;
  /** Byte-weighted language breakdown for this repo, as reported by GitHub's
   * linguist (largest first). Empty for repos GitHub couldn't detect a
   * language for. */
  languages: { name: string; bytes: number }[];
  stargazersCount: number;
  forksCount: number;
  topics: string[];
  pushedAt: string; // ISO date
  fork: boolean;
  archived: boolean;
};

export type GithubSummary = {
  languageBreakdown: Record<string, number>; // percentages, sums to ~100
  projectThemes: string[]; // themes present, ordered by strength
  activitySignal: "High" | "Medium" | "Low" | "None";
  projectDiversity: "High" | "Medium" | "Low";
  aiProjectEvidence: "Strong" | "Moderate" | "Limited";
  repoCount: number;
};

/** Owned, non-fork, non-archived repos — the set every signal in this
 * module is computed from. Exported so read sites (the analysis prompt,
 * the admin view) report the same "repos analyzed" count as the summary
 * they're describing, rather than the raw unfiltered stored list. */
export function countOwnedNonForkRepos(repos: unknown): number {
  if (!Array.isArray(repos)) return 0;
  return (repos as { fork?: boolean; archived?: boolean }[]).filter(
    (r) => !r.fork && !r.archived
  ).length;
}

/** Stars/forks earned and the single most-starred repo, over owned
 * non-fork/non-archived repos — a "reception" read on top of the
 * "activity" and "themes" signals above. */
export function computeRepoKpis(repos: GithubRepoInput[]) {
  const relevant = repos.filter((r) => !r.fork && !r.archived);
  const totalStars = relevant.reduce((sum, r) => sum + r.stargazersCount, 0);
  const totalForks = relevant.reduce((sum, r) => sum + r.forksCount, 0);
  const topRepo = [...relevant].sort((a, b) => b.stargazersCount - a.stargazersCount)[0] ?? null;
  return {
    totalStars,
    totalForks,
    topRepo: topRepo
      ? { name: topRepo.name, description: topRepo.description, stars: topRepo.stargazersCount }
      : null,
  };
}

/** Top languages by byte-weighted percentage, filtering the long tail of
 * near-zero entries a raw byte breakdown always produces, and folding
 * whatever's left into a single "Other" slice so the total still sums to
 * ~100%. Shared by the admin view and the participant dashboard so both
 * read the same language mix the same way. */
export function topLanguages(
  breakdown: Record<string, number>,
  { threshold = 1, max = 6 }: { threshold?: number; max?: number } = {}
): [string, number][] {
  const sorted = Object.entries(breakdown)
    .filter(([, pct]) => pct >= threshold)
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length <= max) return sorted;
  const top = sorted.slice(0, max - 1);
  const otherPct = sorted.slice(max - 1).reduce((sum, [, pct]) => sum + pct, 0);
  return otherPct > 0 ? [...top, ["Other", otherPct]] : top;
}

/** Owned, non-fork, non-archived repos ranked by stars (falling back to
 * recency for repos with none), capped for a compact list. */
export function topReposByStars(repos: GithubRepoInput[], max = 5): GithubRepoInput[] {
  return repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => {
      if (b.stargazersCount !== a.stargazersCount) return b.stargazersCount - a.stargazersCount;
      return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
    })
    .slice(0, max);
}

const THEME_KEYWORDS: Record<string, string[]> = {
  AI: [
    "ai",
    "agent",
    "agents",
    "llm",
    "gpt",
    "gemini",
    "claude",
    "ml",
    "machine-learning",
    "neural",
    "rag",
    "chatbot",
    "openai",
    "anthropic",
    "langchain",
  ],
  "Web Apps": ["web", "nextjs", "react", "webapp", "frontend", "website", "app"],
  Automation: ["automation", "workflow", "bot", "cron", "script", "pipeline"],
  Education: ["education", "learning", "course", "tutorial", "bootcamp", "study"],
  APIs: ["api", "rest", "graphql", "backend", "server", "sdk"],
  Data: ["data", "analytics", "dataset", "etl", "dashboard"],
  Mobile: ["mobile", "android", "ios", "flutter", "react-native"],
  DevTools: ["cli", "devtools", "extension", "plugin", "tool"],
  Games: ["game", "unity", "godot", "gamedev"],
};

function matchesTheme(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

function textFor(repo: GithubRepoInput): string {
  return [repo.name, repo.description ?? "", ...repo.topics]
    .join(" ")
    .toLowerCase();
}

function activeRepos(repos: GithubRepoInput[], withinDays: number, now: Date) {
  const cutoff = now.getTime() - withinDays * 24 * 60 * 60 * 1000;
  return repos.filter((r) => new Date(r.pushedAt).getTime() >= cutoff);
}

export function summarizeGithubActivity(
  repos: GithubRepoInput[],
  now: Date = new Date()
): GithubSummary {
  const relevant = repos.filter((r) => !r.fork && !r.archived);

  if (relevant.length === 0) {
    return {
      languageBreakdown: {},
      projectThemes: [],
      activitySignal: "None",
      projectDiversity: "Low",
      aiProjectEvidence: "Limited",
      repoCount: 0,
    };
  }

  // Language breakdown weighted by actual bytes of code across repos —
  // far more representative than counting "primary language per repo",
  // which treats a 50-line script the same as a 50k-line application.
  const languageBytes = new Map<string, number>();
  for (const repo of relevant) {
    for (const { name, bytes } of repo.languages) {
      languageBytes.set(name, (languageBytes.get(name) ?? 0) + bytes);
    }
  }
  const totalBytes = Array.from(languageBytes.values()).reduce((a, b) => a + b, 0);
  const languageBreakdown: Record<string, number> = {};
  if (totalBytes > 0) {
    for (const [lang, bytes] of languageBytes) {
      languageBreakdown[lang] = Math.round((bytes / totalBytes) * 100);
    }
  }

  // Themes
  const themeCounts = new Map<string, number>();
  for (const repo of relevant) {
    const text = textFor(repo);
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      if (matchesTheme(text, keywords)) {
        themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
      }
    }
  }
  const projectThemes = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  // Activity signal — based on repos pushed in the last 90 days
  const recentlyActive = activeRepos(relevant, 90, now);
  let activitySignal: GithubSummary["activitySignal"];
  const activeRatio = recentlyActive.length / relevant.length;
  if (recentlyActive.length === 0) {
    activitySignal = "Low";
  } else if (activeRatio >= 0.5 || recentlyActive.length >= 3) {
    activitySignal = "High";
  } else {
    activitySignal = "Medium";
  }

  // Project diversity — based on distinct themes
  let projectDiversity: GithubSummary["projectDiversity"];
  if (projectThemes.length >= 4) {
    projectDiversity = "High";
  } else if (projectThemes.length >= 2) {
    projectDiversity = "Medium";
  } else {
    projectDiversity = "Low";
  }

  // AI evidence
  const aiRepoCount = themeCounts.get("AI") ?? 0;
  let aiProjectEvidence: GithubSummary["aiProjectEvidence"];
  if (aiRepoCount >= 3) {
    aiProjectEvidence = "Strong";
  } else if (aiRepoCount >= 1) {
    aiProjectEvidence = "Moderate";
  } else {
    aiProjectEvidence = "Limited";
  }

  return {
    languageBreakdown,
    projectThemes,
    activitySignal,
    projectDiversity,
    aiProjectEvidence,
    repoCount: relevant.length,
  };
}

/**
 * "Open-source contribution" signal (spec §12) — derived from GitHub's
 * contribution-collection totals for roughly the last year, which counts
 * commits across ALL public repos the account touched, not just ones it
 * owns. This is the only place we capture evidence of contributing to
 * other people's projects.
 */
export function deriveContributionSignal(input: {
  totalCommitContributions: number;
  totalRepositoriesWithContributedCommits: number;
}): "Strong" | "Moderate" | "Limited" {
  const { totalCommitContributions, totalRepositoriesWithContributedCommits } = input;
  if (totalCommitContributions >= 200 || totalRepositoriesWithContributedCommits >= 5) {
    return "Strong";
  }
  if (totalCommitContributions >= 30 || totalRepositoriesWithContributedCommits >= 2) {
    return "Moderate";
  }
  return "Limited";
}

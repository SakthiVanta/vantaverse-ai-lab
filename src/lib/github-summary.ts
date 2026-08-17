export type GithubRepoInput = {
  name: string;
  description: string | null;
  language: string | null;
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

  // Language breakdown by primary language across repos
  const languageCounts = new Map<string, number>();
  for (const repo of relevant) {
    if (!repo.language) continue;
    languageCounts.set(repo.language, (languageCounts.get(repo.language) ?? 0) + 1);
  }
  const totalWithLanguage = Array.from(languageCounts.values()).reduce(
    (a, b) => a + b,
    0
  );
  const languageBreakdown: Record<string, number> = {};
  if (totalWithLanguage > 0) {
    for (const [lang, count] of languageCounts) {
      languageBreakdown[lang] = Math.round((count / totalWithLanguage) * 100);
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

import { Octokit } from "octokit";
import type { GithubRepoInput } from "./github-summary";

const GITHUB_SCOPE = "read:user public_repo";

export function buildGithubAuthUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("GITHUB_CLIENT_ID is not set in .env");
  }
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GITHUB_SCOPE,
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubCode(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured in .env");
  }

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(data.error_description ?? "GitHub token exchange failed");
  }
  return data.access_token;
}

export type GithubProfileData = {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  createdAt: string;
  repos: GithubRepoInput[];
};

export async function fetchGithubProfileData(
  accessToken: string
): Promise<GithubProfileData> {
  const octokit = new Octokit({ auth: accessToken });

  const { data: user } = await octokit.rest.users.getAuthenticated();

  const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: "pushed",
    affiliation: "owner",
  });

  return {
    login: user.login,
    name: user.name,
    bio: user.bio,
    avatarUrl: user.avatar_url,
    publicRepos: user.public_repos,
    followers: user.followers,
    createdAt: user.created_at,
    repos: repos.map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stargazersCount: r.stargazers_count ?? 0,
      forksCount: r.forks_count ?? 0,
      topics: r.topics ?? [],
      pushedAt: r.pushed_at ?? r.updated_at ?? new Date().toISOString(),
      fork: r.fork,
      archived: r.archived ?? false,
    })),
  };
}

import { Octokit } from "octokit";
import type { GithubRepoInput } from "./github-summary";

// read:user + public_repo cover everything queried below, including
// contributionsCollection for the authenticated account's public activity —
// no broader/private-repo scope requested, per the spec's "collect only
// what's needed" principle.
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
  /** Commit contributions across ALL public repos (owned or not) in
   * roughly the last year — GitHub's own "contributions" measure. */
  commitContributionsLastYear: number;
  reposContributedToLastYear: number;
};

type GraphqlRepoNode = {
  name: string;
  description: string | null;
  isFork: boolean;
  isArchived: boolean;
  stargazerCount: number;
  forkCount: number;
  pushedAt: string | null;
  updatedAt: string;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  languages: { edges: { size: number; node: { name: string } }[] } | null;
};

type GraphqlResponse = {
  viewer: {
    login: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string;
    createdAt: string;
    followers: { totalCount: number };
    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: GraphqlRepoNode[];
    };
    contributionsCollection: {
      totalCommitContributions: number;
      totalRepositoriesWithContributedCommits: number;
    };
  };
};

const REPOS_QUERY = /* GraphQL */ `
  query ($after: String) {
    viewer {
      login
      name
      bio
      avatarUrl
      createdAt
      followers {
        totalCount
      }
      repositories(
        first: 100
        after: $after
        ownerAffiliations: OWNER
        privacy: PUBLIC
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          description
          isFork
          isArchived
          stargazerCount
          forkCount
          pushedAt
          updatedAt
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
          languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
              }
            }
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalRepositoriesWithContributedCommits
      }
    }
  }
`;

export async function fetchGithubProfileData(
  accessToken: string
): Promise<GithubProfileData> {
  const octokit = new Octokit({ auth: accessToken });

  const repoNodes: GraphqlRepoNode[] = [];
  let after: string | null = null;
  let first: GraphqlResponse["viewer"] | null = null;

  // Paginate through every owned public repo — a prolific builder can
  // easily have more than the 100-per-page GitHub returns in one call.
  do {
    const response: GraphqlResponse = await octokit.graphql(REPOS_QUERY, { after });
    if (!first) first = response.viewer;
    repoNodes.push(...response.viewer.repositories.nodes);
    after = response.viewer.repositories.pageInfo.hasNextPage
      ? response.viewer.repositories.pageInfo.endCursor
      : null;
  } while (after);

  if (!first) {
    throw new Error("GitHub returned no profile data");
  }

  return {
    login: first.login,
    name: first.name,
    bio: first.bio,
    avatarUrl: first.avatarUrl,
    publicRepos: repoNodes.length,
    followers: first.followers.totalCount,
    createdAt: first.createdAt,
    commitContributionsLastYear: first.contributionsCollection.totalCommitContributions,
    reposContributedToLastYear:
      first.contributionsCollection.totalRepositoriesWithContributedCommits,
    repos: repoNodes.map((r) => ({
      name: r.name,
      description: r.description,
      languages: (r.languages?.edges ?? []).map((e) => ({
        name: e.node.name,
        bytes: e.size,
      })),
      stargazersCount: r.stargazerCount,
      forksCount: r.forkCount,
      topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
      pushedAt: r.pushedAt ?? r.updatedAt,
      fork: r.isFork,
      archived: r.isArchived,
    })),
  };
}

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
}

/**
 * Parse a GitHub URL and extract owner/name.
 */
export function parseGitHubUrl(url: string): { owner: string; name: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts.length < 2) return null;
    const [owner, name] = parts;
    if (!owner || !name) return null;
    return { owner, name: name.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

/**
 * Fetch repository metadata from GitHub API.
 */
export async function fetchRepoInfo(owner: string, name: string): Promise<RepoInfo> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "graphyycode/1.0",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
    headers,
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error(`Repository ${owner}/${name} not found`);
    if (res.status === 403) throw new Error("GitHub API rate limit exceeded");
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();

  return {
    owner: data.owner.login,
    name: data.name,
    fullName: data.full_name,
    description: data.description ?? null,
    language: data.language ?? null,
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
  };
}

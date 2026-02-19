import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GraphyyCode/1.0",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "User not found" }, { status: res.status });
    }

    const data = await res.json() as {
      login: string;
      name: string | null;
      avatar_url: string;
      bio: string | null;
      company: string | null;
      location: string | null;
      public_repos: number;
      followers: number;
      html_url: string;
    };

    return NextResponse.json({
      login: data.login,
      name: data.name,
      avatar_url: data.avatar_url,
      bio: data.bio,
      company: data.company,
      location: data.location,
      public_repos: data.public_repos,
      followers: data.followers,
      html_url: data.html_url,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const path = searchParams.get("path");

  if (!owner || !repo || !path) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GraphyyCode/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      { headers, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "File not found on GitHub" }, { status: res.status });
    }

    const data = await res.json();

    if (Array.isArray(data)) {
      return NextResponse.json({ error: "Path is a directory" }, { status: 422 });
    }
    if (data.encoding !== "base64" || !data.content) {
      return NextResponse.json({ error: "Binary or empty file" }, { status: 422 });
    }

    const content = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
    return NextResponse.json({ content, size: data.size });
  } catch {
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}

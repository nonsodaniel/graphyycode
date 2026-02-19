import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndIncrementGuestUsage, GUEST_LIMIT } from "@/lib/guest";
import { parseGitHubUrl, fetchRepoInfo } from "@/lib/github";
import { buildGraph } from "@/lib/graph-builder";
import type { Prisma } from "@prisma/client";

// Allow up to 60 seconds for analysis (Vercel Hobby limit)
export const maxDuration = 60;

const MAX_FILES = 100;
const MAX_FILE_SIZE = 100_000;

const ANALYSABLE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "go", "rs", "rb", "java", "cs", "cpp", "c",
]);

function shouldFetch(path: string, size?: number): boolean {
  if (size && size > MAX_FILE_SIZE) return false;
  const ext = path.split(".").pop()?.toLowerCase();
  return !!ext && ANALYSABLE_EXTENSIONS.has(ext);
}

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "GraphyyCode/1.0",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function fetchTree(owner: string, repo: string) {
  const headers = ghHeaders();
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error(`GitHub API error: ${repoRes.status}`);
  const repoData = await repoRes.json() as { default_branch?: string };
  const branch = repoData.default_branch ?? "main";

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error(`GitHub tree error: ${treeRes.status}`);
  const treeData = await treeRes.json() as { tree: Array<{ path?: string; type?: string; size?: number }> };

  return treeData.tree.filter(
    (item) =>
      item.type === "blob" &&
      item.path &&
      !item.path.startsWith(".git/") &&
      !item.path.includes("node_modules/") &&
      !item.path.includes("dist/") &&
      !item.path.includes(".next/") &&
      !item.path.includes("vendor/") &&
      !item.path.includes("__pycache__/")
  );
}

async function fetchFile(owner: string, repo: string, path: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3.raw",
      "User-Agent": "GraphyyCode/1.0",
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      { headers }
    );
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function runAnalysis(analysisId: string, owner: string, repoName: string) {
  await db.analysis.update({ where: { id: analysisId }, data: { status: "PROCESSING" } });

  try {
    const treeItems = await fetchTree(owner, repoName);
    const toProcess = treeItems.slice(0, MAX_FILES);

    // Fetch all file contents in parallel
    const results = await Promise.allSettled(
      toProcess.map(async (item) => {
        if (!item.path) return null;
        const content = shouldFetch(item.path, item.size)
          ? await fetchFile(owner, repoName, item.path)
          : undefined;
        return { path: item.path, content: content ?? undefined, size: item.size };
      })
    );

    const files: Array<{ path: string; content?: string; size?: number }> = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value !== null) {
        files.push(r.value);
      }
    }

    const artifact = buildGraph(files);

    await db.graphArtifact.upsert({
      where: { analysisId },
      create: {
        analysisId,
        nodes: artifact.nodes as unknown as Prisma.InputJsonValue,
        edges: artifact.edges as unknown as Prisma.InputJsonValue,
        fileTree: artifact.fileTree as unknown as Prisma.InputJsonValue,
        fileRoles: artifact.fileRoles as unknown as Prisma.InputJsonValue,
      },
      update: {
        nodes: artifact.nodes as unknown as Prisma.InputJsonValue,
        edges: artifact.edges as unknown as Prisma.InputJsonValue,
        fileTree: artifact.fileTree as unknown as Prisma.InputJsonValue,
        fileRoles: artifact.fileRoles as unknown as Prisma.InputJsonValue,
      },
    });

    await db.analysis.update({ where: { id: analysisId }, data: { status: "COMPLETED" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db.analysis
      .update({ where: { id: analysisId }, data: { status: "FAILED", error: msg } })
      .catch(() => {});
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();
    const { repoUrl, guestDeviceId } = body as { repoUrl?: string; guestDeviceId?: string };

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub repository URL" }, { status: 400 });
    }

    // Guest limit
    let guestId: string | undefined;
    if (!session?.user) {
      if (!guestDeviceId) {
        return NextResponse.json({ error: "guestDeviceId required for guest access" }, { status: 400 });
      }
      const ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        undefined;
      const result = await checkAndIncrementGuestUsage(guestDeviceId, ipAddress);
      if (!result.allowed) {
        return NextResponse.json(
          { error: "Guest analysis limit reached", code: "GUEST_LIMIT_REACHED", limit: GUEST_LIMIT, count: result.count },
          { status: 429 }
        );
      }
      guestId = guestDeviceId;
    }

    // Repo metadata
    let repoInfo;
    try {
      repoInfo = await fetchRepoInfo(parsed.owner, parsed.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch repository";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const repo = await db.repo.upsert({
      where: { fullName: repoInfo.fullName },
      create: {
        owner: repoInfo.owner, name: repoInfo.name, fullName: repoInfo.fullName,
        description: repoInfo.description, language: repoInfo.language,
        stars: repoInfo.stars, forks: repoInfo.forks,
      },
      update: {
        description: repoInfo.description, language: repoInfo.language,
        stars: repoInfo.stars, forks: repoInfo.forks,
      },
    });

    const analysis = await db.analysis.create({
      data: {
        repoId: repo.id,
        userId: session?.user?.id ?? null,
        guestId: guestId ?? null,
        status: "PENDING",
      },
    });

    if (session?.user?.id) {
      await db.activityEvent.create({
        data: {
          userId: session.user.id, analysisId: analysis.id, type: "ANALYSED",
          metadata: { repoFullName: repoInfo.fullName },
        },
      });
    }

    // ── Process inline (replaces separate worker) ──────────────────────────
    await runAnalysis(analysis.id, repo.owner, repo.name);
    // ──────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      analysisId: analysis.id,
      status: "PENDING", // client polls once and gets COMPLETED
      repo: {
        owner: repo.owner, name: repo.name, fullName: repo.fullName,
        description: repo.description, language: repo.language,
        stars: repo.stars, forks: repo.forks,
      },
    });
  } catch (err) {
    console.error("[/api/analyse] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

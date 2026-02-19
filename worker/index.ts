import "dotenv/config";

/**
 * GraphyyCode Background Worker
 *
 * Polls the database for PENDING analyses, fetches GitHub repository files,
 * builds the dependency graph, stores the artifact, and marks analyses COMPLETED.
 *
 * Usage: pnpm worker
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { buildGraph } from "../lib/graph-builder";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const POLL_INTERVAL_MS = 5000;
const MAX_FILES_TO_ANALYSE = 200;
const MAX_FILE_SIZE_BYTES = 100_000; // 100KB

interface GithubTreeItem {
  path?: string;
  type?: string;
  size?: number;
  sha?: string;
}

interface GithubTreeResponse {
  tree: GithubTreeItem[];
  truncated?: boolean;
}

async function fetchGithubTree(
  owner: string,
  name: string
): Promise<GithubTreeItem[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "graphyycode/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // First get the default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
    headers,
  });
  if (!repoRes.ok) throw new Error(`GitHub API error: ${repoRes.status}`);
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch ?? "main";

  // Fetch file tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${name}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error(`GitHub Tree API error: ${treeRes.status}`);
  const treeData: GithubTreeResponse = await treeRes.json();

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

async function fetchFileContent(
  owner: string,
  name: string,
  path: string
): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "graphyycode/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`,
      { headers }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const ANALYSABLE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs",
  "py", "go", "rs", "rb", "java", "cs", "cpp", "c",
]);

function shouldFetchContent(filePath: string, fileSize?: number): boolean {
  if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) return false;
  const ext = filePath.split(".").pop()?.toLowerCase();
  return !!ext && ANALYSABLE_EXTENSIONS.has(ext);
}

async function processAnalysis(analysisId: string): Promise<void> {
  console.log(`[worker] Processing analysis ${analysisId}`);

  // Mark as PROCESSING
  await db.analysis.update({
    where: { id: analysisId },
    data: { status: "PROCESSING" },
  });

  const analysis = await db.analysis.findUnique({
    where: { id: analysisId },
    include: { repo: true },
  });

  if (!analysis) throw new Error(`Analysis ${analysisId} not found`);

  const { owner, name } = analysis.repo;

  // Fetch file tree
  const treeItems = await fetchGithubTree(owner, name);

  // Limit files to avoid rate limits
  const filesToProcess = treeItems.slice(0, MAX_FILES_TO_ANALYSE);

  // Fetch content for analysable files
  const files: Array<{ path: string; content?: string; size?: number }> = [];
  for (const item of filesToProcess) {
    if (!item.path) continue;
    let content: string | undefined;
    if (shouldFetchContent(item.path, item.size)) {
      const fetched = await fetchFileContent(owner, name, item.path);
      if (fetched) content = fetched;
    }
    files.push({ path: item.path, size: item.size, content });
  }

  // Build graph
  const artifactData = buildGraph(files);

  // Prisma requires JSON fields to be cast through unknown
  const nodes = artifactData.nodes as unknown as import("@prisma/client").Prisma.InputJsonValue;
  const edges = artifactData.edges as unknown as import("@prisma/client").Prisma.InputJsonValue;
  const fileTree = artifactData.fileTree as unknown as import("@prisma/client").Prisma.InputJsonValue;
  const fileRoles = artifactData.fileRoles as unknown as import("@prisma/client").Prisma.InputJsonValue;

  // Store artifact
  await db.graphArtifact.upsert({
    where: { analysisId },
    create: { analysisId, nodes, edges, fileTree, fileRoles },
    update: { nodes, edges, fileTree, fileRoles },
  });

  // Mark COMPLETED
  await db.analysis.update({
    where: { id: analysisId },
    data: { status: "COMPLETED" },
  });

  console.log(
    `[worker] Completed ${analysisId}: ${artifactData.nodes.length} nodes, ${artifactData.edges.length} edges`
  );
}

async function poll(): Promise<void> {
  try {
    // Find oldest PENDING analysis
    const pending = await db.analysis.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (!pending) return;

    await processAnalysis(pending.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Error: ${message}`);

    // Try to mark the analysis as FAILED if we know which one it is
    // (best effort — if the DB is down this will also fail)
    try {
      const processing = await db.analysis.findFirst({
        where: { status: "PROCESSING" },
        orderBy: { createdAt: "asc" },
      });
      if (processing) {
        await db.analysis.update({
          where: { id: processing.id },
          data: { status: "FAILED", error: message },
        });
      }
    } catch {
      // silently ignore
    }
  }
}

async function main(): Promise<void> {
  console.log("[worker] Starting GraphyyCode analysis worker...");
  console.log(`[worker] Polling every ${POLL_INTERVAL_MS}ms`);

  // Poll immediately then on interval
  await poll();
  setInterval(() => {
    poll().catch((err) => console.error("[worker] Uncaught poll error:", err));
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});

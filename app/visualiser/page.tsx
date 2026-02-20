"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Network,
  FolderTree,
  FileSearch,
  Loader2,
  AlertCircle,
  ArrowLeft,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { GraphView } from "@/components/visualiser/GraphView";
import { FileTree } from "@/components/visualiser/FileTree";
import { ExplainPanel } from "@/components/visualiser/ExplainPanel";
import { ScreenshotButton } from "@/components/visualiser/ScreenshotButton";
import type { GraphNode, GraphEdge, FileTreeNode } from "@/lib/graph-builder";
import { guestHistory } from "@/lib/cache";

type Tab = "graph" | "files" | "explain";
type AnalysisStatus = "idle" | "pending" | "processing" | "completed" | "failed";

interface AnalysisData {
  id: string;
  status: string;
  repo: {
    owner: string;
    name: string;
    fullName: string;
    language?: string;
    description?: string;
    stars?: number;
    forks?: number;
  };
  artifact?: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    fileTree: FileTreeNode;
    fileRoles: Record<string, string>;
  } | null;
}

function getOrCreateGuestId(): string {
  const key = "graphyycode_guest_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function VisualiserContent() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repo");

  const [tab, setTab] = useState<Tab>("graph");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const pollAnalysis = useCallback(
    async (analysisId: string, guestDeviceId?: string) => {
      const maxAttempts = 60;
      let attempts = 0;

      const poll = async () => {
        attempts++;
        try {
          const url = new URL(`/api/analysis/${analysisId}`, window.location.origin);
          if (guestDeviceId) url.searchParams.set("guestId", guestDeviceId);

          const res = await fetch(url.toString());
          if (!res.ok) {
            setError("Could not fetch analysis status");
            setStatus("failed");
            return;
          }
          const data: AnalysisData = await res.json();

          if (data.status === "COMPLETED" && data.artifact) {
            setAnalysis(data);
            setStatus("completed");
            // Save to local guest history (best-effort, works offline too)
            guestHistory.add({
              id: data.id,
              repoUrl: `https://github.com/${data.repo.fullName}`,
              repoFullName: data.repo.fullName,
              language: data.repo.language ?? null,
              description: null,
              status: "COMPLETED",
              createdAt: new Date().toISOString(),
              nodeCount: data.artifact.nodes.length,
              edgeCount: data.artifact.edges.length,
            });
            return;
          }

          if (data.status === "FAILED") {
            setError("Analysis failed");
            setStatus("failed");
            return;
          }

          if (attempts < maxAttempts) {
            setTimeout(poll, 3000);
          } else {
            setError("Analysis timed out — the worker may not be running");
            setStatus("failed");
          }
        } catch {
          setError("Network error while polling for results");
          setStatus("failed");
        }
      };

      await poll();
    },
    []
  );

  const startAnalysis = useCallback(async () => {
    if (!repoUrl) return;

    setStatus("pending");
    setError(null);

    let guestDeviceId: string | undefined;
    try {
      guestDeviceId = getOrCreateGuestId();
    } catch {
      // localStorage not available (SSR safety)
    }

    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, guestDeviceId }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        setError("Server error — check that DATABASE_URL is configured");
        setStatus("failed");
        return;
      }

      if (!res.ok) {
        setError((data.error as string) ?? "Analysis failed");
        setStatus("failed");
        return;
      }

      setAnalysis(data as unknown as AnalysisData);
      setStatus("processing");
      pollAnalysis((data.analysisId as string), guestDeviceId);
    } catch {
      setError("Network error — could not reach the server");
      setStatus("failed");
    }
  }, [repoUrl, pollAnalysis]);

  useEffect(() => {
    if (repoUrl) {
      startAnalysis();
    }
  }, [repoUrl, startAnalysis]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedFilePath(node.path);
    if (window.innerWidth < 768) {
      setTab("explain");
    }
  };

  const handleNodeSelect = useCallback((nodeId: string) => {
    const node = analysis?.artifact?.nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setSelectedFilePath(node.path);
    }
  }, [analysis?.artifact?.nodes]);

  const handleFileClick = (path: string) => {
    const node = analysis?.artifact?.nodes.find((n) => n.id === path);
    if (node) {
      setSelectedNode(node);
      setSelectedFilePath(path);
      if (window.innerWidth < 768) {
        setTab("explain");
      } else {
        setTab("graph");
      }
    }
  };

  const incomingCount = selectedNode
    ? (analysis?.artifact?.edges ?? []).filter((e) => e.target === selectedNode.id).length
    : 0;
  const outgoingCount = selectedNode
    ? (analysis?.artifact?.edges ?? []).filter((e) => e.source === selectedNode.id).length
    : 0;

  return (
    <main className="h-screen bg-[#0B0B0C] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 h-12 px-4 border-b border-[#2A2A2E] shrink-0">
        <Link href="/" className="text-[#8A8A9A] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitBranch className="w-3.5 h-3.5 text-[#8A8A9A] shrink-0" />
          <span className="text-sm text-white font-mono truncate">
            {analysis?.repo?.fullName ?? repoUrl ?? "GraphyyCode"}
          </span>
          {analysis?.repo?.language && (
            <span className="text-xs text-[#4A4A5A] border border-[#2A2A2E] rounded px-1.5 py-0.5 shrink-0">
              {analysis.repo.language}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {status === "pending" || status === "processing" ? (
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {status === "pending" ? "Starting..." : "Analysing..."}
            </div>
          ) : status === "completed" ? (
            <span className="text-xs text-green-400">Ready</span>
          ) : status === "failed" ? (
            <span className="text-xs text-red-400">Failed</span>
          ) : null}
        </div>

        {/* Screenshot button — show when completed */}
        {status === "completed" && (
          <ScreenshotButton
            targetRef={graphContainerRef}
            analysisId={analysis?.id}
            repoFullName={analysis?.repo?.fullName}
          />
        )}
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden flex border-b border-[#2A2A2E] shrink-0">
        {(
          [
            { id: "graph", label: "Graph", Icon: Network },
            { id: "files", label: "Files", Icon: FolderTree },
            { id: "explain", label: "Explain", Icon: FileSearch },
          ] as const
        ).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-medium transition-colors ${
              tab === id
                ? "text-white border-b-2 border-blue-500"
                : "text-[#8A8A9A]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: file tree sidebar */}
        <div className="hidden md:block w-56 border-r border-[#2A2A2E] bg-[#0B0B0C] overflow-hidden">
          {analysis?.artifact?.fileTree ? (
            <FileTree
              tree={analysis.artifact.fileTree}
              onFileClick={handleFileClick}
              selectedPath={selectedFilePath}
            />
          ) : (
            <div className="p-4 text-xs text-[#4A4A5A]">Loading...</div>
          )}
        </div>

        {/* Graph area */}
        <div
          ref={graphContainerRef}
          className={`flex-1 overflow-hidden ${tab !== "graph" ? "hidden md:block" : ""}`}
        >
          {status === "idle" && !repoUrl && (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div>
                <GitBranch className="w-12 h-12 text-[#2A2A2E] mx-auto mb-4" />
                <p className="text-[#8A8A9A] text-sm mb-4">No repository selected</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go back and enter a repo URL
                </Link>
              </div>
            </div>
          )}

          {(status === "pending" || status === "processing") && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-white text-sm mb-1">
                  {status === "pending" ? "Starting analysis..." : "Analysing repository..."}
                </p>
                <p className="text-xs text-[#4A4A5A]">
                  Fetching files and building dependency graph
                </p>
              </div>
            </div>
          )}

          {status === "failed" && error && (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                <p className="text-white text-sm mb-2">Analysis failed</p>
                <p className="text-xs text-[#8A8A9A] mb-6">{error}</p>
                <button
                  onClick={startAnalysis}
                  className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {status === "completed" && analysis?.artifact && (
            <GraphView
              nodes={analysis.artifact.nodes}
              edges={analysis.artifact.edges}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNode?.id}
            />
          )}
        </div>

        {/* Mobile: file tree */}
        {tab === "files" && (
          <div className="md:hidden flex-1 overflow-hidden bg-[#0B0B0C]">
            {analysis?.artifact?.fileTree ? (
              <FileTree
                tree={analysis.artifact.fileTree}
                onFileClick={handleFileClick}
                selectedPath={selectedFilePath}
              />
            ) : (
              <div className="p-4 text-xs text-[#4A4A5A]">
                {status !== "completed" ? "Waiting for analysis..." : "No file tree available"}
              </div>
            )}
          </div>
        )}

        {/* Explain panel — desktop sidebar + mobile tab */}
        <div
          className={`
            ${tab !== "explain" ? "hidden md:block" : "flex-1 md:flex-none"}
            md:w-80 border-l border-[#2A2A2E] bg-[#0B0B0C] overflow-hidden
          `}
        >
          <ExplainPanel
            node={selectedNode}
            fileRoles={analysis?.artifact?.fileRoles ?? {}}
            incomingCount={incomingCount}
            outgoingCount={outgoingCount}
            edges={analysis?.artifact?.edges ?? []}
            nodes={analysis?.artifact?.nodes ?? []}
            repo={analysis?.repo ? { owner: analysis.repo.owner, name: analysis.repo.name, fullName: analysis.repo.fullName, language: analysis.repo.language, description: analysis.repo.description, stars: analysis.repo.stars, forks: analysis.repo.forks } : null}
            onNodeSelect={handleNodeSelect}
            totalNodes={analysis?.artifact?.nodes.length ?? 1}
          />
        </div>
      </div>

    </main>
  );
}

export default function VisualiserPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#0B0B0C] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <VisualiserContent />
    </Suspense>
  );
}

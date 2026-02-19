"use client";

import { useState, useEffect, useCallback, useRef, useMemo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCode,
  Folder,
  GitBranch,
  Code2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Zap,
  Star,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  Network,
  Info,
  Sparkles,
  GitFork,
  Shield,
  RefreshCw,
  Globe,
  Building2,
  Users,
} from "lucide-react";
import type { GraphNode, GraphEdge } from "@/lib/graph-builder";

type PanelTab = "overview" | "imports" | "usedby" | "code" | "ai";

interface ExplainPanelProps {
  node: GraphNode | null;
  fileRoles: Record<string, string>;
  incomingCount?: number;
  outgoingCount?: number;
  edges?: GraphEdge[];
  nodes?: GraphNode[];
  repo?: {
    owner: string;
    name: string;
    fullName?: string;
    language?: string;
    description?: string;
    stars?: number;
    forks?: number;
  } | null;
  onNodeSelect?: (nodeId: string) => void;
  totalNodes?: number;
}

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  html_url: string;
}

// ─── Language colours ─────────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Go: "#00add8",
  Rust: "#dea584",
  Ruby: "#cc342d",
  Java: "#ed8b00",
  "C#": "#178600",
  "C++": "#f34b7d",
  C: "#555555",
};

// ─── Code parser ──────────────────────────────────────────────────────────────

function parseSymbols(code: string) {
  const lines = code.split("\n");
  const lineCount = lines.length;
  let blankLines = 0, commentLines = 0, inBlock = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t) { blankLines++; continue; }
    if (inBlock) { commentLines++; if (t.includes("*/")) inBlock = false; continue; }
    if (t.startsWith("/*") || t.startsWith("/**")) {
      commentLines++; inBlock = !t.includes("*/"); continue;
    }
    if (t.startsWith("//") || t.startsWith("#") || t.startsWith("*")) commentLines++;
  }

  const exports: string[] = [], functions: string[] = [], classes: string[] = [],
    types: string[] = [], externalImports: string[] = [];

  for (const m of code.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\s+|class\s+)(\w+)/gm))
    exports.push(m[1]);
  for (const m of code.matchAll(/^export\s+(?:const|let|var|type|interface|enum)\s+(\w+)/gm))
    exports.push(m[1]);
  const brace = code.match(/^export\s*\{([^}]+)\}/m);
  if (brace) for (const n of brace[1].split(",")) {
    const x = n.trim().split(" as ")[0].trim(); if (x) exports.push(x);
  }
  for (const m of code.matchAll(/(?:async\s+)?function\s+(\w+)/g)) functions.push(m[1]);
  for (const m of code.matchAll(/class\s+(\w+)/g)) classes.push(m[1]);
  for (const m of code.matchAll(/^(?:export\s+)?(?:type|interface)\s+(\w+)/gm)) types.push(m[1]);
  for (const m of code.matchAll(/^import\s+.*?\s+from\s+['"]([^.@][^'"]*)['"]/gm)) {
    const mod = m[1].split("/")[0]; if (!externalImports.includes(mod)) externalImports.push(mod);
  }
  for (const m of code.matchAll(/require\(['"]([^.@][^'"]*)['"]\)/g)) {
    const mod = m[1].split("/")[0]; if (!externalImports.includes(mod)) externalImports.push(mod);
  }

  const jsdocMatch = code.match(/\/\*\*([\s\S]*?)\*\//);
  const jsdoc = jsdocMatch
    ? jsdocMatch[1].replace(/^\s*\*\s?/gm, "").replace(/@\w+.*/g, "").trim()
    : null;

  // Complexity (cyclomatic approximation)
  const complexityPatterns = ["\\bif\\b", "\\belse\\b", "\\bfor\\b", "\\bwhile\\b",
    "\\bswitch\\b", "\\bcase\\b", "\\bcatch\\b", "&&", "\\|\\|", "\\?\\s"];
  let complexity = 1;
  for (const p of complexityPatterns) {
    complexity += (code.match(new RegExp(p, "g")) ?? []).length;
  }

  // TODOs
  const todos: Array<{ type: string; text: string; line: number }> = [];
  lines.forEach((ln, i) => {
    const m = ln.match(/\/\/\s*(TODO|FIXME|HACK|XXX|NOTE)[:\s]+(.*)/i);
    if (m) todos.push({ type: m[1].toUpperCase(), text: m[2].trim(), line: i + 1 });
  });

  // Security patterns
  const security: string[] = [];
  if (/process\.env\./i.test(code)) security.push("Env vars");
  if (/\bauth\b.*\(|\bgetSession\b|\buseSession\b/i.test(code)) security.push("Auth");
  if (/\bprisma\b|\bdb\b\.\s*\w+\.(find|create|update|delete)/i.test(code)) security.push("Database");
  if (/\bfetch\b\(|\baxios\b\./i.test(code)) security.push("Network");
  if (/dangerouslySetInnerHTML/i.test(code)) security.push("⚠ XSS");
  if (/\beval\b\(|new\s+Function\b/i.test(code)) security.push("⚠ eval");

  return {
    lineCount,
    codeLines: lineCount - blankLines - commentLines,
    blankLines,
    commentLines,
    exports: [...new Set(exports)],
    functions: [...new Set(functions)],
    classes: [...new Set(classes)],
    types: [...new Set(types)],
    externalImports: [...new Set(externalImports)],
    jsdoc,
    complexity,
    todos,
    security,
  };
}

// ─── Graph traversal helpers ──────────────────────────────────────────────────

// BFS from all entry points (no incoming edges) to find the shortest import path to targetId.
// Returns an ordered array of node IDs: [entryPoint, ..., targetId], or [] if unreachable.
function findImportPath(targetId: string, edges: GraphEdge[], nodes: GraphNode[]): string[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  const fileNodes = nodes.filter((n) => n.type !== "folder");
  const entryIds = fileNodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
  if (entryIds.includes(targetId)) return [targetId]; // it IS an entry point

  const parent = new Map<string, string | null>();
  const queue: string[] = [];
  for (const ep of entryIds.slice(0, 30)) { // cap for perf
    parent.set(ep, null);
    queue.push(ep);
  }

  let found = false;
  outer: while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.source === cur && !parent.has(e.target)) {
        parent.set(e.target, cur);
        if (e.target === targetId) { found = true; break outer; }
        queue.push(e.target);
      }
    }
  }

  if (!found) return [];
  const path: string[] = [];
  let cur: string | null = targetId;
  while (cur !== null) {
    path.unshift(cur);
    cur = parent.get(cur) ?? null;
  }
  return path;
}

// BFS backwards: all files that transitively import nodeId, with hop distance.
function buildTransitiveDependents(
  nodeId: string,
  edges: GraphEdge[]
): Array<{ id: string; distance: number }> {
  const dist = new Map<string, number>();
  const queue: [string, number][] = [[nodeId, 0]];
  while (queue.length) {
    const [id, d] = queue.shift()!;
    if (dist.has(id)) continue;
    dist.set(id, d);
    for (const e of edges) {
      if (e.target === id && !dist.has(e.source)) queue.push([e.source, d + 1]);
    }
  }
  dist.delete(nodeId);
  return [...dist.entries()].map(([id, distance]) => ({ id, distance })).sort((a, b) => a.distance - b.distance);
}

function complexityLabel(score: number): { label: string; color: string } {
  if (score < 10) return { label: "Simple", color: "#10b981" };
  if (score < 20) return { label: "Moderate", color: "#f59e0b" };
  if (score < 40) return { label: "Complex", color: "#f97316" };
  return { label: "Very Complex", color: "#ef4444" };
}

function detectTechStack(nodes: GraphNode[]): string[] {
  const paths = nodes.map((n) => n.path.toLowerCase());
  const stack: string[] = [];
  if (paths.some((p) => p.includes("app/") && (p.endsWith("page.tsx") || p.endsWith("layout.tsx"))))
    stack.push("Next.js");
  else if (paths.some((p) => p.endsWith(".tsx") || p.endsWith(".jsx")))
    stack.push("React");
  if (paths.some((p) => p.endsWith(".py"))) stack.push("Python");
  if (paths.some((p) => p.endsWith(".go"))) stack.push("Go");
  if (paths.some((p) => p.endsWith(".rs"))) stack.push("Rust");
  if (paths.some((p) => p.includes("test") || p.includes("spec"))) stack.push("Tests");
  if (paths.some((p) => p.includes("prisma/schema"))) stack.push("Prisma");
  if (paths.some((p) => p.endsWith("dockerfile") || p.includes("docker-compose")))
    stack.push("Docker");
  return [...new Set(stack)];
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return (
            <code key={i} className="bg-[#1A1A1E] text-blue-300 px-1 py-0.5 rounded text-[9.5px] font-mono">
              {part.slice(1, -1)}
            </code>
          );
        return part;
      })}
    </>
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-white mt-4 mb-1.5 pb-1 border-b border-[#1A1A1E]">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-xs font-semibold text-[#C9C9D4] mt-3 mb-1">{line.slice(4)}</h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="text-[11px] text-[#C9C9D4] ml-4 list-disc leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      elements.push(
        <li key={i} className="text-[11px] text-[#C9C9D4] ml-4 list-decimal leading-relaxed">
          {renderInline(line.replace(/^\d+\.\s/, ""))}
        </li>
      );
    } else if (line === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(
        <p key={i} className="text-[11px] text-[#C9C9D4] leading-relaxed">{renderInline(line)}</p>
      );
    }
  }
  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CodeViewer({
  code,
  onExplainSelection,
}: {
  code: string;
  onExplainSelection?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX = 60;
  const lines = code.split("\n");
  const visible = expanded ? lines : lines.slice(0, MAX);
  const hasMore = lines.length > MAX;

  // Show a left-side "Explain" button when text is selected inside the code viewer
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        if (!text || text.length < 5) {
          setTooltip(null);
          return;
        }
        if (!containerRef.current || !sel || sel.rangeCount === 0) {
          setTooltip(null);
          return;
        }
        const range = sel.getRangeAt(0);
        if (!containerRef.current.contains(range.commonAncestorContainer)) {
          setTooltip(null);
          return;
        }
        const selRect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setTooltip({
          text,
          // Pin horizontally to the left edge of the code viewer
          x: containerRect.left + 2,
          // Vertically centred on the selection
          y: selRect.top + selRect.height / 2,
        });
      }, 50);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Hide tooltip when selection is cleared
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length < 5) setTooltip(null);
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Left-side "Explain" CTA — fixed to left edge of code viewer, centred on selection */}
      <AnimatePresence>
        {tooltip && onExplainSelection && (
          <motion.button
            key="explain-tooltip"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.13 }}
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-100%, -50%)",
              zIndex: 9999,
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const captured = tooltip.text;
              setTooltip(null);
              window.getSelection()?.removeAllRanges();
              onExplainSelection(captured);
            }}
            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xl shadow-blue-900/60 transition-colors whitespace-nowrap border border-blue-400/30 select-none"
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            Explain
            <span className="text-blue-200 text-[10px] ml-0.5">→</span>
          </motion.button>
        )}
      </AnimatePresence>

      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] bg-[#1A1A1E] border border-[#2A2A2E] rounded px-2 py-1 text-[#8A8A9A] hover:text-white transition-colors"
      >
        {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
      </button>

      {/* pre-based viewer for clean text selection */}
      <div className="overflow-auto max-h-96 bg-[#080809] border border-[#1E1E22] rounded-md text-[10.5px] font-mono">
        <div className="flex min-w-full">
          {/* Non-selectable line numbers */}
          <div className="select-none shrink-0 flex flex-col text-right border-r border-[#1A1A1E] bg-[#080809] sticky left-0 z-10">
            {visible.map((_, i) => (
              <span key={i} className="px-2 text-[#3A3A4A] leading-5">{i + 1}</span>
            ))}
          </div>
          {/* Selectable code */}
          <pre className="pl-3 pr-8 text-[#C9C9D4] leading-5 whitespace-pre flex-1 overflow-x-auto">
            {visible.join("\n")}
          </pre>
        </div>
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-[#6A6A7A] hover:text-white mt-1.5 py-1 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3 h-3" />Collapse</>
            : <><ChevronDown className="w-3 h-3" />+{lines.length - MAX} more lines</>}
        </button>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center bg-[#111114] border border-[#2A2A2E] rounded-lg px-3 py-2.5">
      <span className="text-xl font-bold tabular-nums" style={{ color: color ?? "#3B82F6" }}>{value}</span>
      <span className="text-[9px] text-[#6A6A7A] mt-0.5 uppercase tracking-wider">{label}</span>
    </div>
  );
}

function TagBadge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${bg} ${color} ${border}`}>
      {label}
    </span>
  );
}

function NodeLink({ node, onClick }: { node: GraphNode; onClick: () => void }) {
  const langColor = node.language ? LANG_COLORS[node.language] : undefined;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-[#1A1A1E] rounded-md text-left transition-colors group"
    >
      <FileCode className="w-3.5 h-3.5 text-[#4A4A5A] group-hover:text-blue-400 shrink-0 transition-colors" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#C9C9D4] group-hover:text-white truncate transition-colors">{node.label}</p>
        <p className="text-[9px] text-[#4A4A5A] truncate font-mono">{node.path}</p>
      </div>
      {langColor && (
        <span
          className="text-[9px] shrink-0 px-1.5 py-0.5 rounded font-mono"
          style={{ background: `${langColor}18`, color: langColor, border: `1px solid ${langColor}33` }}
        >
          {node.language?.slice(0, 2).toUpperCase()}
        </span>
      )}
      <ArrowRight className="w-3 h-3 text-[#3A3A4A] group-hover:text-blue-400 shrink-0 transition-colors" />
    </button>
  );
}

function SymbolTag({ label, variant }: { label: string; variant: "export" | "fn" | "class" | "type" | "pkg" }) {
  const styles = {
    export: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    fn: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    class: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    type: "bg-green-500/10 text-green-400 border-green-500/20",
    pkg: "bg-[#1E1E22] text-[#8A8A9A] border-[#2A2A2E]",
  }[variant];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono border ${styles}`}>{label}</span>
  );
}

function AiOutput({
  text,
  loading,
  error,
  onRetry,
}: {
  text: string;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  if (loading && !text) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div className="relative">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <Sparkles className="w-3 h-3 text-purple-400 absolute -top-1 -right-1" />
        </div>
        <p className="text-xs text-[#6A6A7A]">Generating analysis…</p>
      </div>
    );
  }

  if (error && !text) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <AlertTriangle className="w-6 h-6 text-red-400" />
        <p className="text-xs text-[#8A8A9A]">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
          >
            <RefreshCw className="w-3 h-3" />Retry
          </button>
        )}
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="bg-[#0A0A0D] border border-[#1E1E22] rounded-lg p-3">
      <MarkdownRenderer text={text} />
      {loading && (
        <span className="inline-block w-1.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExplainPanel({
  node,
  fileRoles,
  incomingCount = 0,
  outgoingCount = 0,
  edges = [],
  nodes = [],
  repo = null,
  onNodeSelect,
  totalNodes = 1,
}: ExplainPanelProps) {
  const [tab, setTab] = useState<PanelTab>("overview");
  const [code, setCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showAllDeps, setShowAllDeps] = useState(false);

  // AI state for file/snippet
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<"file" | "snippet">("file");
  const [snippetText, setSnippetText] = useState<string | null>(null);

  // Repo-level AI
  const [repoAiText, setRepoAiText] = useState("");
  const [repoAiLoading, setRepoAiLoading] = useState(false);

  // GitHub author
  const [repoOwner, setRepoOwner] = useState<GitHubUser | null>(null);

  const codeCache = useRef<Record<string, string>>({});
  const aiCache = useRef<Record<string, string>>({});
  const prevNodeId = useRef<string | null>(null);

  // Reset on node change
  useEffect(() => {
    if (node?.id !== prevNodeId.current) {
      prevNodeId.current = node?.id ?? null;
      setTab("overview");
      setAiText("");
      setAiError(null);
      setAiMode("file");
      setSnippetText(null);
      setCodeError(null);
      if (node?.id && codeCache.current[node.id]) {
        setCode(codeCache.current[node.id]);
      } else {
        setCode(null);
      }
    }
  }, [node?.id]);

  // Fetch author when viewing codebase overview
  useEffect(() => {
    if (!node && repo?.owner && !repoOwner) {
      fetch(`/api/github-user?username=${encodeURIComponent(repo.owner)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setRepoOwner(data as GitHubUser))
        .catch(() => {});
    }
  }, [node, repo?.owner, repoOwner]);

  // Auto-fetch code when Code tab opens
  useEffect(() => {
    if (tab === "code" && node && !code && !codeLoading && !codeError) {
      fetchCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, node?.id]);

  // Auto-fetch AI for snippet mode when switching to AI tab
  useEffect(() => {
    if (tab === "ai" && aiMode === "snippet" && snippetText && !aiText && !aiLoading) {
      fetchAiExplain("snippet", snippetText);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, aiMode, snippetText]);

  const fetchCode = useCallback(async () => {
    if (!node || !repo) return;
    if (codeCache.current[node.id]) { setCode(codeCache.current[node.id]); return; }
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = await fetch(
        `/api/file-content?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}&path=${encodeURIComponent(node.path)}`
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setCodeError((e as { error?: string }).error ?? "Failed to load file");
        return;
      }
      const { content } = await res.json() as { content: string };
      codeCache.current[node.id] = content;
      setCode(content);
    } catch {
      setCodeError("Network error — could not fetch file");
    } finally {
      setCodeLoading(false);
    }
  }, [node, repo]);

  const fetchAiExplain = useCallback(
    async (type: "file" | "snippet", snippet?: string) => {
      if (!node) return;
      const cacheKey = type === "snippet"
        ? `snippet:${node.id}:${snippet?.slice(0, 30)}`
        : node.id;

      // 1. In-session memory cache
      if (aiCache.current[cacheKey]) {
        setAiText(aiCache.current[cacheKey]);
        return;
      }

      // 2. Persistent localStorage cache (survives reloads)
      const lsKey = `gyycode_ai_${repo?.fullName ?? "repo"}_${cacheKey}`;
      try {
        const stored = localStorage.getItem(lsKey);
        if (stored) {
          aiCache.current[cacheKey] = stored;
          setAiText(stored);
          return;
        }
      } catch { /* localStorage unavailable */ }

      setAiLoading(true);
      setAiError(null);
      setAiText("");

      let codeContent = code;

      // For file mode, load code first if needed
      if (type === "file" && !codeContent && repo) {
        try {
          const res = await fetch(
            `/api/file-content?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}&path=${encodeURIComponent(node.path)}`
          );
          if (res.ok) {
            const data = await res.json() as { content: string };
            codeContent = data.content;
            codeCache.current[node.id] = data.content;
            setCode(data.content);
          }
        } catch { /* fall through */ }
      }

      try {
        const body = type === "snippet"
          ? { type: "snippet", snippet, filePath: node.path, repoFullName: repo?.fullName }
          : { type: "file", code: codeContent?.slice(0, 8000), filePath: node.path, repoFullName: repo?.fullName };

        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const e = await res.json().catch(() => ({}));
          setAiError((e as { error?: string }).error ?? "AI explanation unavailable");
          setAiLoading(false);
          return;
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          setAiText(fullText);
        }
        aiCache.current[cacheKey] = fullText;
        // Persist to localStorage so it survives page reloads
        try {
          localStorage.setItem(lsKey, fullText);
        } catch { /* storage full or unavailable */ }
      } catch {
        setAiError("Network error — could not reach AI service");
      } finally {
        setAiLoading(false);
      }
    },
    [node, code, repo]
  );

  const fetchRepoAi = useCallback(async () => {
    if (!repo) return;
    const fileNodes = nodes.filter((n) => n.type !== "folder");
    const incomingMap: Record<string, number> = {};
    for (const e of edges) incomingMap[e.target] = (incomingMap[e.target] ?? 0) + 1;
    const hubs = fileNodes
      .map((n) => ({ label: n.label, count: incomingMap[n.id] ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((x) => `${x.label} (${x.count}×)`)
      .join(", ");
    const entryPoints = fileNodes
      .filter((n) => !incomingMap[n.id])
      .slice(0, 5)
      .map((n) => n.label)
      .join(", ");
    const roleEntries = Object.entries(fileRoles)
      .slice(0, 15)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");

    setRepoAiLoading(true);
    setRepoAiText("");

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "repo",
          repoFullName: repo.fullName ?? `${repo.owner}/${repo.name}`,
          fileCount: fileNodes.length,
          edgeCount: edges.length,
          language: repo.language,
          hubs,
          entries: entryPoints,
          roles: roleEntries,
        }),
      });

      if (!res.ok) { setRepoAiText("❌ AI analysis not available."); setRepoAiLoading(false); return; }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setRepoAiText(fullText);
      }
    } catch {
      setRepoAiText("❌ Failed to generate analysis.");
    } finally {
      setRepoAiLoading(false);
    }
  }, [repo, nodes, edges, fileRoles]);

  const handleSnippetSelect = useCallback((text: string) => {
    setSnippetText(text);
    setAiMode("snippet");
    setAiText("");
    setAiError(null);
    setTab("ai");
    // Directly trigger fetch — don't rely on useEffect
    fetchAiExplain("snippet", text);
  }, [fetchAiExplain]);

  // Import chain from entry points to selected file
  const importPath = useMemo(
    () => node ? findImportPath(node.id, edges, nodes) : [],
    [node?.id, edges, nodes] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // All transitive dependents (files that import this, directly or indirectly)
  const transitiveDependents = useMemo(
    () => node ? buildTransitiveDependents(node.id, edges) : [],
    [node?.id, edges] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Derived data
  const importedNodes = edges
    .filter((e) => e.source === node?.id)
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter((n): n is GraphNode => !!n);

  const dependentNodes = edges
    .filter((e) => e.target === node?.id)
    .map((e) => nodes.find((n) => n.id === e.source))
    .filter((n): n is GraphNode => !!n);

  const circularDeps = importedNodes.filter((dep) =>
    edges.some((e) => e.source === dep.id && e.target === node?.id)
  );

  const connectivity =
    totalNodes > 1
      ? Math.min(100, Math.round(((incomingCount + outgoingCount) / (totalNodes - 1)) * 100))
      : 0;

  const isHub = incomingCount >= 5;
  const isEntryPoint = outgoingCount > 0 && incomingCount === 0;
  const isLeaf = outgoingCount === 0 && incomingCount > 0;
  const isIsolated = outgoingCount === 0 && incomingCount === 0;

  const roleStr = node ? (fileRoles[node.id] ?? node.role ?? "Module — A source code file") : "";
  const [roleTitle, roleDesc] = roleStr.includes(" — ") ? roleStr.split(" — ") : [roleStr, ""];
  const symbols = code ? parseSymbols(code) : null;
  const langColor = node?.language ? LANG_COLORS[node.language] : undefined;
  const complexity = symbols ? complexityLabel(symbols.complexity) : null;

  const TABS: { id: PanelTab; label: string; Icon: typeof Code2; count?: number }[] = [
    { id: "overview", label: "Info", Icon: Info },
    { id: "imports", label: "Imports", Icon: Package, count: outgoingCount },
    { id: "usedby", label: "Used By", Icon: Network, count: incomingCount },
    { id: "code", label: "Code", Icon: Code2 },
    { id: "ai", label: "AI", Icon: Sparkles },
  ];

  // ── No node selected → Codebase overview ─────────────────────────────────

  if (!node) {
    const fileNodes = nodes.filter((n) => n.type !== "folder");
    const hasData = fileNodes.length > 0;

    if (!hasData) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-[#111114] border border-[#2A2A2E] flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-[#4A4A5A]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#6A6A7A]">No file selected</p>
            <p className="text-[11px] text-[#4A4A5A] mt-1">Click any node in the graph to inspect it</p>
          </div>
        </div>
      );
    }

    const incomingMap: Record<string, number> = {};
    const outgoingMap: Record<string, number> = {};
    for (const e of edges) {
      incomingMap[e.target] = (incomingMap[e.target] ?? 0) + 1;
      outgoingMap[e.source] = (outgoingMap[e.source] ?? 0) + 1;
    }

    const langCounts: Record<string, number> = {};
    for (const n of fileNodes) {
      if (n.language) langCounts[n.language] = (langCounts[n.language] ?? 0) + 1;
    }
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    const maxLangCount = sortedLangs[0]?.[1] ?? 1;

    const hubs = fileNodes
      .map((n) => ({ node: n, count: incomingMap[n.id] ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const entryPoints = fileNodes.filter((n) => !incomingMap[n.id] && outgoingMap[n.id]).slice(0, 4);
    const orphanCount = fileNodes.filter((n) => !incomingMap[n.id] && !outgoingMap[n.id]).length;
    const avgImports = fileNodes.length > 0 ? (edges.length / fileNodes.length).toFixed(1) : "0";
    const techStack = detectTechStack(fileNodes);

    return (
      <div className="h-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-3 flex flex-col gap-3"
        >
          {/* Author card */}
          {repo && (
            <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
              {repoOwner ? (
                <div className="flex items-start gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={repoOwner.avatar_url}
                    alt={repoOwner.login}
                    className="w-10 h-10 rounded-full border border-[#2A2A2E] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-white truncate">
                        {repoOwner.name ?? repoOwner.login}
                      </p>
                      <a
                        href={repoOwner.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#4A4A5A] hover:text-blue-400 transition-colors"
                      >
                        @{repoOwner.login}
                      </a>
                    </div>
                    {repoOwner.bio && (
                      <p className="text-[10px] text-[#8A8A9A] mt-0.5 leading-relaxed line-clamp-2">
                        {repoOwner.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {repoOwner.company && (
                        <span className="flex items-center gap-1 text-[9px] text-[#6A6A7A]">
                          <Building2 className="w-2.5 h-2.5" />{repoOwner.company.replace("@", "")}
                        </span>
                      )}
                      {repoOwner.location && (
                        <span className="flex items-center gap-1 text-[9px] text-[#6A6A7A]">
                          <Globe className="w-2.5 h-2.5" />{repoOwner.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[9px] text-[#6A6A7A]">
                        <Users className="w-2.5 h-2.5" />{repoOwner.followers.toLocaleString()} followers
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#1A1A1E] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[#1A1A1E] rounded animate-pulse w-28" />
                    <div className="h-2.5 bg-[#1A1A1E] rounded animate-pulse w-20" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Repo header + stats */}
          <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <p className="text-xs font-semibold text-white truncate">
                {repo?.fullName ?? (repo ? `${repo.owner}/${repo.name}` : "Repository")}
              </p>
            </div>
            {repo?.description && (
              <p className="text-[10px] text-[#8A8A9A] mb-2 leading-relaxed">{repo.description}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {repo?.language && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: `${LANG_COLORS[repo.language] ?? "#2A2A2E"}18`,
                    color: LANG_COLORS[repo.language] ?? "#8A8A9A",
                    border: `1px solid ${LANG_COLORS[repo.language] ?? "#2A2A2E"}40`,
                  }}
                >
                  {repo.language}
                </span>
              )}
              {repo?.stars !== undefined && repo.stars > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-[#8A8A9A]">
                  <Star className="w-2.5 h-2.5 text-yellow-400" />
                  {repo.stars.toLocaleString()}
                </span>
              )}
              {repo?.forks !== undefined && repo.forks > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-[#8A8A9A]">
                  <GitFork className="w-2.5 h-2.5" />
                  {repo.forks.toLocaleString()}
                </span>
              )}
            </div>

            {/* Tech stack */}
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#1A1A1E]">
                {techStack.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.5 bg-[#1A1A1E] border border-[#2A2A2E] rounded text-[#8A8A9A]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Files", value: fileNodes.length, color: "#3B82F6" },
              { label: "Dependencies", value: edges.length, color: "#10b981" },
              { label: "Avg imports", value: avgImports, color: "#a78bfa" },
              { label: "Isolated", value: orphanCount, color: orphanCount > 0 ? "#f59e0b" : "#6A6A7A" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-2.5 flex flex-col items-center"
              >
                <span className="text-xl font-bold tabular-nums" style={{ color }}>{value}</span>
                <span className="text-[9px] text-[#6A6A7A] uppercase tracking-wider mt-0.5">{label}</span>
              </div>
            ))}
          </div>

          {/* Language breakdown */}
          {sortedLangs.length > 0 && (
            <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
              <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest mb-2">Languages</p>
              <div className="space-y-2">
                {sortedLangs.slice(0, 5).map(([lang, count]) => {
                  const pct = Math.round((count / fileNodes.length) * 100);
                  const color = LANG_COLORS[lang] ?? "#8A8A9A";
                  return (
                    <div key={lang}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-[#C9C9D4]">{lang}</span>
                        <span className="text-[10px] text-[#6A6A7A]">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((count / maxLangCount) * 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hub files */}
          {hubs.length > 0 && (
            <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Star className="w-3 h-3 text-yellow-400" />
                <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest">Most imported</p>
              </div>
              <div className="space-y-0.5">
                {hubs.map(({ node: n, count }) => (
                  <button
                    key={n.id}
                    onClick={() => onNodeSelect?.(n.id)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 hover:bg-[#1A1A1E] rounded transition-colors group"
                  >
                    <span className="text-[11px] text-[#C9C9D4] group-hover:text-white truncate font-mono">
                      {n.label}
                    </span>
                    <span className="text-[10px] text-blue-400 shrink-0 font-semibold">{count}×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Entry points */}
          {entryPoints.length > 0 && (
            <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3 text-green-400" />
                <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest">Entry points</p>
              </div>
              <div className="space-y-0.5">
                {entryPoints.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onNodeSelect?.(n.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-[#1A1A1E] rounded transition-colors group"
                  >
                    <ArrowRight className="w-3 h-3 text-green-400 shrink-0" />
                    <span className="text-[11px] text-[#C9C9D4] group-hover:text-white truncate font-mono">
                      {n.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Architecture overview */}
          <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest">AI Architecture Analysis</p>
              </div>
              {!repoAiText && !repoAiLoading && (
                <button
                  onClick={fetchRepoAi}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors font-medium"
                >
                  Generate →
                </button>
              )}
              {repoAiText && !repoAiLoading && (
                <button
                  onClick={() => { setRepoAiText(""); }}
                  className="text-[10px] text-[#4A4A5A] hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {!repoAiText && !repoAiLoading && (
              <p className="text-[10px] text-[#4A4A5A]">
                Get an AI-powered overview of the architecture, design patterns, and code quality.
              </p>
            )}

            {repoAiLoading && !repoAiText && (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                <span className="text-[10px] text-[#6A6A7A]">Analyzing codebase…</span>
              </div>
            )}

            {repoAiText && (
              <div className="text-[11px]">
                <MarkdownRenderer text={repoAiText} />
                {repoAiLoading && (
                  <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-0.5 rounded-sm" />
                )}
              </div>
            )}
          </div>

          <p className="text-[10px] text-[#4A4A5A] text-center">
            Click any node in the graph to inspect its code and dependencies
          </p>
        </motion.div>
      </div>
    );
  }

  // ── File selected ─────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* File header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={node.id + "-header"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="px-3 pt-3 pb-2.5 border-b border-[#1A1A1E] shrink-0"
        >
          <div className="flex items-start gap-2 mb-2">
            {node.type === "folder"
              ? <Folder className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              : <FileCode className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{node.label}</p>
              <p className="text-[9px] text-[#4A4A5A] font-mono truncate mt-0.5">{node.path}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {node.language && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: `${langColor ?? "#2A2A2E"}18`,
                  color: langColor ?? "#8A8A9A",
                  border: `1px solid ${langColor ?? "#2A2A2E"}40`,
                }}
              >
                {node.language}
              </span>
            )}
            {importPath.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[#1A1A2E] text-[#8888C8] border border-[#38386A]"
                title={`${importPath.length - 1} hops from entry point`}
              >
                depth {importPath.length - 1}
              </span>
            )}
            {isHub && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/25">
                <Star className="w-2.5 h-2.5" />Hub
              </span>
            )}
            {isEntryPoint && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-green-500/10 text-green-400 border border-green-500/25">
                <Zap className="w-2.5 h-2.5" />Entry
              </span>
            )}
            {isLeaf && (
              <TagBadge label="Leaf" color="text-purple-400" bg="bg-purple-500/10" border="border-purple-500/25" />
            )}
            {isIsolated && (
              <TagBadge label="Isolated" color="text-[#6A6A7A]" bg="bg-[#1A1A1E]" border="border-[#2A2A2E]" />
            )}
            {circularDeps.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-500/10 text-red-400 border border-red-500/25">
                <AlertTriangle className="w-2.5 h-2.5" />Circular
              </span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Tab bar */}
      <div className="flex border-b border-[#1A1A1E] shrink-0">
        {TABS.map(({ id, label, Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-medium transition-colors relative ${
              tab === id ? "text-white" : "text-[#5A5A6A] hover:text-[#9A9AAA]"
            }`}
          >
            <div className="relative">
              <Icon className={`w-3.5 h-3.5 ${id === "ai" && tab === "ai" ? "text-purple-400" : ""}`} />
              {count !== undefined && count > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[8px] bg-blue-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </div>
            <span className={id === "ai" && tab === "ai" ? "text-purple-400" : ""}>{label}</span>
            {tab === id && (
              <motion.div
                layoutId="explain-tab-indicator"
                className={`absolute bottom-0 left-0 right-0 h-px ${id === "ai" ? "bg-purple-500" : "bg-blue-500"}`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab + node.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="p-3 flex flex-col gap-3"
          >

            {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <MetricCard label="Imports" value={outgoingCount} color="#3B82F6" />
                  <MetricCard label="Used By" value={incomingCount} color="#10b981" />
                  <MetricCard
                    label="Size"
                    value={node.size !== undefined
                      ? node.size >= 1024 ? `${(node.size / 1024).toFixed(1)}k` : `${node.size}B`
                      : "—"}
                    color="#a78bfa"
                  />
                </div>

                {/* Connectivity bar */}
                <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] text-[#6A6A7A]">Graph connectivity</span>
                    <span className="text-[10px] font-bold text-white">{connectivity}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #1d4ed8, #3B82F6)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${connectivity}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-[9px] text-[#4A4A5A] mt-1.5">
                    Touches {incomingCount + outgoingCount} of {Math.max(totalNodes - 1, 0)} other files
                  </p>
                </div>

                {/* Role */}
                <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                  <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest mb-1.5">Role</p>
                  <p className="text-xs font-semibold text-white">{roleTitle}</p>
                  {roleDesc && (
                    <p className="text-[11px] text-[#8A8A9A] mt-1 leading-relaxed">{roleDesc}</p>
                  )}
                </div>

                {/* Import chain — breadcrumb from entry point */}
                {importPath.length > 1 && (
                  <div className="bg-[#0E0E1A] border border-[#38386A] rounded-lg p-3">
                    <p className="text-[9px] text-[#6868A8] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <ArrowRight className="w-2.5 h-2.5" />Source path
                    </p>
                    <div className="flex flex-col gap-0">
                      {importPath.map((id: string, idx: number) => {
                        const n = nodes.find((n) => n.id === id);
                        const isLast = idx === importPath.length - 1;
                        return (
                          <div key={id} className="flex items-center gap-1.5">
                            {/* Connector line */}
                            <div className="flex flex-col items-center shrink-0" style={{ width: 16 }}>
                              {idx > 0 && <div className="w-px h-2 bg-[#38386A]" />}
                              <div className={`w-2 h-2 rounded-full border ${isLast ? "bg-blue-500 border-blue-400" : "bg-[#38384A] border-[#58588A]"}`} />
                              {!isLast && <div className="w-px flex-1 bg-[#38386A]" style={{ minHeight: 6 }} />}
                            </div>
                            <button
                              onClick={() => onNodeSelect?.(id)}
                              className={`text-[10px] font-mono truncate max-w-full text-left leading-relaxed py-0.5 transition-colors ${
                                isLast ? "text-blue-300 font-semibold" : "text-[#8888B8] hover:text-white"
                              }`}
                            >
                              {n?.label ?? id}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {importPath.length === 1 && (
                  <div className="bg-[#0E0E1A] border border-[#38386A] rounded-lg px-3 py-2 flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-green-400 shrink-0" />
                    <p className="text-[10px] text-[#8888B8]">Entry point — not imported by anything</p>
                  </div>
                )}

                {/* JSDoc */}
                {symbols?.jsdoc && (
                  <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                    <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest mb-1.5">Description</p>
                    <p className="text-[11px] text-[#C9C9D4] leading-relaxed">{symbols.jsdoc}</p>
                  </div>
                )}

                {/* Code stats when loaded */}
                {symbols && (
                  <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest">Code stats</p>
                      {complexity && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded border font-medium"
                          style={{
                            color: complexity.color,
                            background: `${complexity.color}18`,
                            borderColor: `${complexity.color}40`,
                          }}
                        >
                          {complexity.label}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Lines", value: symbols.lineCount, color: "#e2e8f0" },
                        { label: "Code", value: symbols.codeLines, color: "#3B82F6" },
                        { label: "Comments", value: symbols.commentLines, color: "#6A6A7A" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-[#0B0B0C] rounded p-2">
                          <p className="text-sm font-bold" style={{ color }}>{value}</p>
                          <p className="text-[9px] text-[#4A4A5A]">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Security patterns */}
                    {symbols.security.length > 0 && (
                      <div>
                        <p className="text-[9px] text-[#4A4A5A] mb-1.5 flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5" />Patterns detected
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {symbols.security.map((s) => (
                            <span
                              key={s}
                              className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                                s.startsWith("⚠")
                                  ? "bg-red-500/10 text-red-400 border-red-500/25"
                                  : "bg-[#1E1E22] text-[#8A8A9A] border-[#2A2A2E]"
                              }`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TODOs */}
                    {symbols.todos.length > 0 && (
                      <div>
                        <p className="text-[9px] text-[#4A4A5A] mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-yellow-500" />
                          {symbols.todos.length} TODO{symbols.todos.length !== 1 ? "s" : ""}
                        </p>
                        <div className="space-y-1">
                          {symbols.todos.slice(0, 4).map((t, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 mt-0.5 ${
                                t.type === "FIXME" ? "bg-red-500/20 text-red-400"
                                  : t.type === "HACK" ? "bg-orange-500/20 text-orange-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}>{t.type}</span>
                              <span className="text-[10px] text-[#8A8A9A] leading-relaxed">{t.text}</span>
                            </div>
                          ))}
                          {symbols.todos.length > 4 && (
                            <p className="text-[9px] text-[#4A4A5A]">+{symbols.todos.length - 4} more</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Exports */}
                    {symbols.exports.length > 0 && (
                      <div>
                        <p className="text-[9px] text-[#4A4A5A] mb-1.5">Exports ({symbols.exports.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {symbols.exports.map((e) => <SymbolTag key={e} label={e} variant="export" />)}
                        </div>
                      </div>
                    )}

                    {symbols.classes.length > 0 && (
                      <div>
                        <p className="text-[9px] text-[#4A4A5A] mb-1.5">Classes</p>
                        <div className="flex flex-wrap gap-1">
                          {symbols.classes.map((c) => <SymbolTag key={c} label={c} variant="class" />)}
                        </div>
                      </div>
                    )}

                    {symbols.functions.length > 0 && (
                      <div>
                        <p className="text-[9px] text-[#4A4A5A] mb-1.5">Functions ({symbols.functions.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {symbols.functions.slice(0, 12).map((f) => (
                            <SymbolTag key={f} label={`${f}()`} variant="fn" />
                          ))}
                          {symbols.functions.length > 12 && (
                            <span className="text-[9px] text-[#4A4A5A] self-center">
                              +{symbols.functions.length - 12}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {symbols.types.length > 0 && (
                      <div>
                        <p className="text-[9px] text-[#4A4A5A] mb-1.5">Types & Interfaces</p>
                        <div className="flex flex-wrap gap-1">
                          {symbols.types.map((t) => <SymbolTag key={t} label={t} variant="type" />)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Circular dep warning */}
                {circularDeps.length > 0 && (
                  <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <p className="text-xs font-semibold text-red-400">Circular dependency</p>
                    </div>
                    <p className="text-[11px] text-[#8A8A9A] mb-2">Mutually imports with:</p>
                    <div className="space-y-1">
                      {circularDeps.map((dep) => (
                        <button
                          key={dep.id}
                          onClick={() => onNodeSelect?.(dep.id)}
                          className="text-[11px] text-red-300 font-mono hover:text-red-200 transition-colors block"
                        >
                          {dep.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* GitHub link */}
                {repo && (
                  <a
                    href={`https://github.com/${repo.owner}/${repo.name}/blob/main/${node.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-[#5A5A6A] hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />View on GitHub
                  </a>
                )}

                {/* Quick actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setTab("code")}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] bg-[#111114] border border-[#2A2A2E] rounded-md text-[#8A8A9A] hover:text-white hover:border-[#3A3A4A] transition-colors"
                  >
                    <Code2 className="w-3 h-3" />View Code
                  </button>
                  <button
                    onClick={() => { setAiMode("file"); setTab("ai"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] bg-purple-500/10 border border-purple-500/25 rounded-md text-purple-400 hover:bg-purple-500/20 transition-colors font-medium"
                  >
                    <Sparkles className="w-3 h-3" />Analyze with AI
                  </button>
                </div>

                {!code && !codeLoading && (
                  <p className="text-[10px] text-[#4A4A5A] text-center">
                    Open the Code tab to see detailed symbol analysis
                  </p>
                )}
              </>
            )}

            {/* ══ IMPORTS ═══════════════════════════════════════════════════════ */}
            {tab === "imports" && (
              <>
                {importedNodes.length > 0 ? (
                  <>
                    <p className="text-[10px] text-[#6A6A7A]">
                      Imports from {importedNodes.length} internal file{importedNodes.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {importedNodes.map((n) => (
                        <NodeLink key={n.id} node={n} onClick={() => onNodeSelect?.(n.id)} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="w-8 h-8 text-[#2A2A2E] mb-3" />
                    <p className="text-xs text-[#4A4A5A]">No internal imports detected</p>
                    <p className="text-[10px] text-[#3A3A44] mt-1">May still use external packages</p>
                  </div>
                )}

                {symbols && symbols.externalImports.length > 0 && (
                  <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                    <p className="text-[10px] text-[#6A6A7A] mb-2">
                      External packages ({symbols.externalImports.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {symbols.externalImports.map((pkg) => (
                        <SymbolTag key={pkg} label={pkg} variant="pkg" />
                      ))}
                    </div>
                  </div>
                )}

                {!code && !codeLoading && (
                  <button
                    onClick={() => setTab("code")}
                    className="text-[11px] text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    → Load code to see external packages
                  </button>
                )}
              </>
            )}

            {/* ══ USED BY ═══════════════════════════════════════════════════════ */}
            {tab === "usedby" && (
              <>
                {dependentNodes.length > 0 || transitiveDependents.length > 0 ? (
                  <>
                    {/* Header row with Direct/All toggle */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-[#6A6A7A]">
                        {showAllDeps
                          ? `${transitiveDependents.length} file${transitiveDependents.length !== 1 ? "s" : ""} total (transitive)`
                          : `${dependentNodes.length} direct importer${dependentNodes.length !== 1 ? "s" : ""}`
                        }
                      </p>
                      <div className="flex items-center gap-0.5 bg-[#111118] border border-[#2A2A36] rounded-md p-0.5">
                        <button
                          onClick={() => setShowAllDeps(false)}
                          className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${!showAllDeps ? "bg-[#252535] text-white" : "text-[#5A5A7A] hover:text-white"}`}
                        >Direct</button>
                        <button
                          onClick={() => setShowAllDeps(true)}
                          className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${showAllDeps ? "bg-[#252535] text-white" : "text-[#5A5A7A] hover:text-white"}`}
                        >
                          All {transitiveDependents.length > dependentNodes.length ? `(${transitiveDependents.length})` : ""}
                        </button>
                      </div>
                    </div>

                    {/* Impact bar */}
                    {!showAllDeps && (
                      <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                        <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest mb-1.5">Change impact</p>
                        <p className="text-[11px] text-[#C9C9D4]">
                          Modifying this file directly affects{" "}
                          <span className="text-white font-semibold">{dependentNodes.length}</span> file
                          {dependentNodes.length !== 1 ? "s" : ""}.
                          {transitiveDependents.length > dependentNodes.length && (
                            <span className="text-[#6A6A7A]"> ({transitiveDependents.length} total including indirect)</span>
                          )}
                        </p>
                        <div className="mt-2 h-1.5 bg-[#1A1A1E] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: incomingCount >= 10 ? "#ef4444" : incomingCount >= 5 ? "#f59e0b" : "#10b981",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (incomingCount / Math.max(totalNodes - 1, 1)) * 100)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Direct importers list */}
                    {!showAllDeps && (
                      <div className="flex flex-col gap-0.5">
                        {dependentNodes.map((n) => (
                          <NodeLink key={n.id} node={n} onClick={() => onNodeSelect?.(n.id)} />
                        ))}
                      </div>
                    )}

                    {/* All transitive dependents, grouped by hop distance */}
                    {showAllDeps && (
                      <div className="flex flex-col gap-3">
                        {(() => {
                          const maxDist = Math.max(...transitiveDependents.map((d: { id: string; distance: number }) => d.distance), 0);
                          const groups: Array<{ dist: number; items: typeof transitiveDependents }> = [];
                          for (let d = 1; d <= maxDist; d++) {
                            const items = transitiveDependents.filter((x: { id: string; distance: number }) => x.distance === d);
                            if (items.length) groups.push({ dist: d, items });
                          }
                          const hopColors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22d3ee"];
                          return groups.map(({ dist, items }) => {
                            const color = hopColors[dist - 1] ?? "#8A8A9A";
                            return (
                              <div key={dist}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                                  <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color }}>
                                    {dist === 1 ? "Direct importers" : `${dist} hops away`}
                                    <span className="ml-1.5 text-[#4A4A5A] font-normal normal-case tracking-normal">({items.length})</span>
                                  </p>
                                </div>
                                <div className="flex flex-col gap-0.5 pl-4">
                                  {items.slice(0, 10).map(({ id }: { id: string }) => {
                                    const n = nodes.find((n) => n.id === id);
                                    if (!n) return null;
                                    return <NodeLink key={id} node={n} onClick={() => onNodeSelect?.(id)} />;
                                  })}
                                  {items.length > 10 && (
                                    <p className="text-[9px] text-[#4A4A5A] px-2.5 py-1">+{items.length - 10} more</p>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                        {transitiveDependents.length === 0 && (
                          <p className="text-[10px] text-[#4A4A5A] text-center py-4">No dependents found</p>
                        )}
                      </div>
                    )}

                    {!showAllDeps && isHub && (
                      <span className="flex items-center gap-1 text-[10px] text-yellow-400 justify-center">
                        <Star className="w-3 h-3" />Hub file
                      </span>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Network className="w-8 h-8 text-[#2A2A2E] mb-3" />
                    <p className="text-xs text-[#4A4A5A]">Not imported by any file</p>
                    {isEntryPoint && (
                      <p className="text-[11px] text-green-400 mt-2 flex items-center gap-1">
                        <Zap className="w-3 h-3" />Likely an entry point
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ══ CODE ══════════════════════════════════════════════════════════ */}
            {tab === "code" && (
              <>
                {codeLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    <p className="text-xs text-[#6A6A7A]">Fetching from GitHub…</p>
                  </div>
                )}

                {codeError && !codeLoading && (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <AlertTriangle className="w-8 h-8 text-red-400" />
                    <p className="text-xs text-[#8A8A9A]">{codeError}</p>
                    <button
                      onClick={() => { setCodeError(null); fetchCode(); }}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!repo && !codeLoading && (
                  <p className="text-xs text-[#6A6A7A] text-center py-8">Repository info not available</p>
                )}

                {code && symbols && !codeLoading && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-[#6A6A7A]">
                        <span>{symbols.lineCount} lines</span>
                        <span className="text-[#3A3A4A]">·</span>
                        <span>{symbols.codeLines} code</span>
                        {complexity && (
                          <>
                            <span className="text-[#3A3A4A]">·</span>
                            <span style={{ color: complexity.color }}>{complexity.label}</span>
                          </>
                        )}
                      </div>
                      {repo && (
                        <a
                          href={`https://github.com/${repo.owner}/${repo.name}/blob/main/${node.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-[#5A5A6A] hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <p className="text-[10px] text-[#4A4A5A] -mt-1">
                      Select any code then click "Explain" to get an AI explanation
                    </p>

                    <CodeViewer code={code} onExplainSelection={handleSnippetSelect} />

                    {/* Symbols summary */}
                    {(symbols.exports.length > 0 || symbols.functions.length > 0 ||
                      symbols.classes.length > 0 || symbols.types.length > 0 ||
                      symbols.externalImports.length > 0) && (
                      <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3 space-y-2.5">
                        <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest">Symbols</p>

                        {symbols.exports.length > 0 && (
                          <div>
                            <p className="text-[9px] text-[#4A4A5A] mb-1">Exports ({symbols.exports.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {symbols.exports.map((e) => <SymbolTag key={e} label={e} variant="export" />)}
                            </div>
                          </div>
                        )}
                        {symbols.classes.length > 0 && (
                          <div>
                            <p className="text-[9px] text-[#4A4A5A] mb-1">Classes</p>
                            <div className="flex flex-wrap gap-1">
                              {symbols.classes.map((c) => <SymbolTag key={c} label={c} variant="class" />)}
                            </div>
                          </div>
                        )}
                        {symbols.functions.length > 0 && (
                          <div>
                            <p className="text-[9px] text-[#4A4A5A] mb-1">Functions ({symbols.functions.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {symbols.functions.slice(0, 10).map((f) => (
                                <SymbolTag key={f} label={`${f}()`} variant="fn" />
                              ))}
                              {symbols.functions.length > 10 && (
                                <span className="text-[9px] text-[#4A4A5A] self-center">
                                  +{symbols.functions.length - 10}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {symbols.types.length > 0 && (
                          <div>
                            <p className="text-[9px] text-[#4A4A5A] mb-1">Types & Interfaces</p>
                            <div className="flex flex-wrap gap-1">
                              {symbols.types.map((t) => <SymbolTag key={t} label={t} variant="type" />)}
                            </div>
                          </div>
                        )}
                        {symbols.externalImports.length > 0 && (
                          <div>
                            <p className="text-[9px] text-[#4A4A5A] mb-1">
                              External packages ({symbols.externalImports.length})
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {symbols.externalImports.map((pkg) => (
                                <SymbolTag key={pkg} label={pkg} variant="pkg" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ AI ════════════════════════════════════════════════════════════ */}
            {tab === "ai" && (
              <>
                {/* Snippet mode header */}
                {aiMode === "snippet" && snippetText && (
                  <div className="bg-[#0A0A0D] border border-purple-500/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] text-purple-400 uppercase tracking-widest">Selected snippet</p>
                      <button
                        onClick={() => { setAiMode("file"); setSnippetText(null); setAiText(""); setAiError(null); }}
                        className="text-[10px] text-[#4A4A5A] hover:text-white transition-colors"
                      >
                        ✕ Clear
                      </button>
                    </div>
                    <pre className="text-[10px] text-[#C9C9D4] font-mono whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                      {snippetText}
                    </pre>
                  </div>
                )}

                {/* Action button */}
                {!aiText && !aiLoading && (
                  <button
                    onClick={() => fetchAiExplain(aiMode, snippetText ?? undefined)}
                    className="w-full flex items-center justify-center gap-2 h-10 bg-purple-500/15 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:bg-purple-500/25 transition-colors font-medium"
                  >
                    <Sparkles className="w-4 h-4" />
                    {aiMode === "snippet" ? "Explain this snippet" : "Analyze this file"}
                  </button>
                )}

                {/* File mode context */}
                {aiMode === "file" && !aiText && !aiLoading && !aiError && (
                  <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                    <p className="text-[10px] text-[#6A6A7A] leading-relaxed">
                      AI will analyze <span className="text-white font-mono">{node.label}</span> and explain its purpose,
                      key exports, architecture patterns, and any potential concerns.
                    </p>
                  </div>
                )}

                <AiOutput
                  text={aiText}
                  loading={aiLoading}
                  error={aiError}
                  onRetry={() => fetchAiExplain(aiMode, snippetText ?? undefined)}
                />

                {/* Reset after completion */}
                {aiText && !aiLoading && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAiText(""); setAiError(null); const k = aiMode === "snippet" ? `snippet:${node.id}:${snippetText?.slice(0, 30)}` : node.id; delete aiCache.current[k]; }}
                      className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] border border-[#2A2A2E] rounded-md text-[#6A6A7A] hover:text-white hover:border-[#3A3A4A] transition-colors bg-[#111114]"
                    >
                      <RefreshCw className="w-3 h-3" />Regenerate
                    </button>
                    {aiMode === "snippet" && (
                      <button
                        onClick={() => { setAiMode("file"); setSnippetText(null); setAiText(""); setAiError(null); }}
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] border border-[#2A2A2E] rounded-md text-[#6A6A7A] hover:text-white hover:border-[#3A3A4A] transition-colors bg-[#111114]"
                      >
                        Analyze whole file
                      </button>
                    )}
                  </div>
                )}

                {/* Tip for snippet */}
                {aiMode === "file" && !aiText && !aiLoading && (
                  <p className="text-[10px] text-[#4A4A5A] text-center">
                    Tip: go to Code tab, select any text, and click "Explain" for snippet analysis
                  </p>
                )}
              </>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

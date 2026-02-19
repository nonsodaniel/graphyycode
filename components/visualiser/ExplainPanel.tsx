"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import type { GraphNode, GraphEdge } from "@/lib/graph-builder";

type PanelTab = "overview" | "imports" | "usedby" | "code";

interface ExplainPanelProps {
  node: GraphNode | null;
  fileRoles: Record<string, string>;
  incomingCount?: number;
  outgoingCount?: number;
  edges?: GraphEdge[];
  nodes?: GraphNode[];
  repo?: { owner: string; name: string } | null;
  onNodeSelect?: (nodeId: string) => void;
  totalNodes?: number;
}

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

// ─── Code parser ─────────────────────────────────────────────────────────────

function parseSymbols(code: string) {
  const lines = code.split("\n");
  const lineCount = lines.length;
  let blankLines = 0;
  let commentLines = 0;
  let inBlock = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t) { blankLines++; continue; }
    if (inBlock) { commentLines++; if (t.includes("*/")) inBlock = false; continue; }
    if (t.startsWith("/*") || t.startsWith("/**")) { commentLines++; inBlock = !t.includes("*/"); continue; }
    if (t.startsWith("//") || t.startsWith("#") || t.startsWith("*")) commentLines++;
  }

  const exports: string[] = [];
  const functions: string[] = [];
  const classes: string[] = [];
  const types: string[] = [];
  const externalImports: string[] = [];

  for (const m of code.matchAll(/^export\s+(?:default\s+)?(?:async\s+)?(?:function\s+|class\s+)(\w+)/gm))
    exports.push(m[1]);
  for (const m of code.matchAll(/^export\s+(?:const|let|var|type|interface|enum)\s+(\w+)/gm))
    exports.push(m[1]);
  const brace = code.match(/^export\s*\{([^}]+)\}/m);
  if (brace) for (const n of brace[1].split(",")) { const x = n.trim().split(" as ")[0].trim(); if (x) exports.push(x); }

  for (const m of code.matchAll(/(?:async\s+)?function\s+(\w+)/g)) functions.push(m[1]);
  for (const m of code.matchAll(/class\s+(\w+)/g)) classes.push(m[1]);
  for (const m of code.matchAll(/^(?:export\s+)?(?:type|interface)\s+(\w+)/gm)) types.push(m[1]);

  for (const m of code.matchAll(/^import\s+.*?\s+from\s+['"]([^.@][^'"]*)['"]/gm)) {
    const mod = m[1].split("/")[0];
    if (!externalImports.includes(mod)) externalImports.push(mod);
  }
  for (const m of code.matchAll(/require\(['"]([^.@][^'"]*)['"]\)/g)) {
    const mod = m[1].split("/")[0];
    if (!externalImports.includes(mod)) externalImports.push(mod);
  }

  const jsdocMatch = code.match(/\/\*\*([\s\S]*?)\*\//);
  const jsdoc = jsdocMatch
    ? jsdocMatch[1].replace(/^\s*\*\s?/gm, "").replace(/@\w+.*/g, "").trim()
    : null;

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
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CodeViewer({ code }: { code: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const MAX = 60;
  const lines = code.split("\n");
  const visible = expanded ? lines : lines.slice(0, MAX);
  const hasMore = lines.length > MAX;

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute top-2 right-2 z-10 flex items-center gap-1 text-[10px] bg-[#1A1A1E] border border-[#2A2A2E] rounded px-2 py-1 text-[#8A8A9A] hover:text-white transition-colors"
      >
        {copied ? <><Check className="w-3 h-3 text-green-400" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
      </button>
      <div className="overflow-auto max-h-96 bg-[#080809] border border-[#1E1E22] rounded-md text-[10.5px] font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {visible.map((line, i) => (
              <tr key={i} className="hover:bg-[#111114] transition-colors">
                <td className="select-none text-right text-[#3A3A4A] px-2 w-8 border-r border-[#1A1A1E] leading-5 shrink-0">
                  {i + 1}
                </td>
                <td className="pl-3 pr-8 leading-5 text-[#C9C9D4] whitespace-pre">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const codeCache = useRef<Record<string, string>>({});
  const prevNodeId = useRef<string | null>(null);

  // Reset when node changes
  useEffect(() => {
    if (node?.id !== prevNodeId.current) {
      prevNodeId.current = node?.id ?? null;
      setTab("overview");
      if (node?.id && codeCache.current[node.id]) {
        setCode(codeCache.current[node.id]);
      } else {
        setCode(null);
      }
      setCodeError(null);
    }
  }, [node?.id]);

  const fetchCode = useCallback(async () => {
    if (!node || !repo) return;
    if (codeCache.current[node.id]) {
      setCode(codeCache.current[node.id]);
      return;
    }
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
      const { content } = (await res.json()) as { content: string };
      codeCache.current[node.id] = content;
      setCode(content);
    } catch {
      setCodeError("Network error — could not fetch file");
    } finally {
      setCodeLoading(false);
    }
  }, [node, repo]);

  // Auto-fetch when Code tab is opened
  useEffect(() => {
    if (tab === "code" && node && !code && !codeLoading && !codeError) {
      fetchCode();
    }
  }, [tab, node, code, codeLoading, codeError, fetchCode]);

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

  const TABS: { id: PanelTab; label: string; Icon: typeof Code2; count?: number }[] = [
    { id: "overview", label: "Info", Icon: Info },
    { id: "imports", label: "Imports", Icon: Package, count: outgoingCount },
    { id: "usedby", label: "Used By", Icon: Network, count: incomingCount },
    { id: "code", label: "Code", Icon: Code2 },
  ];

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (!node) {
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── File header ─────────────────────────────────────────────────────── */}
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

          {/* Badges */}
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

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
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
              <Icon className="w-3.5 h-3.5" />
              {count !== undefined && count > 0 && (
                <span className="absolute -top-1.5 -right-2 text-[8px] bg-blue-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </div>
            <span>{label}</span>
            {tab === id && (
              <motion.div layoutId="explain-tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
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
                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2">
                  <MetricCard label="Imports" value={outgoingCount} color="#3B82F6" />
                  <MetricCard label="Used By" value={incomingCount} color="#10b981" />
                  <MetricCard
                    label="Size"
                    value={
                      node.size !== undefined
                        ? node.size >= 1024
                          ? `${(node.size / 1024).toFixed(1)}k`
                          : `${node.size}B`
                        : "—"
                    }
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

                {/* JSDoc description — only if code already loaded */}
                {symbols?.jsdoc && (
                  <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3">
                    <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest mb-1.5">Description</p>
                    <p className="text-[11px] text-[#C9C9D4] leading-relaxed">{symbols.jsdoc}</p>
                  </div>
                )}

                {/* Code stats + symbols — shown once code is loaded */}
                {symbols && (
                  <div className="bg-[#111114] border border-[#2A2A2E] rounded-lg p-3 space-y-3">
                    <p className="text-[9px] text-[#4A4A5A] uppercase tracking-widest">Code stats</p>

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
                          {symbols.functions.slice(0, 12).map((f) => <SymbolTag key={f} label={`${f}()`} variant="fn" />)}
                          {symbols.functions.length > 12 && (
                            <span className="text-[9px] text-[#4A4A5A] self-center">+{symbols.functions.length - 12}</span>
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
                    <p className="text-[11px] text-[#8A8A9A] mb-2">
                      Mutually imports with:
                    </p>
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
                    <ExternalLink className="w-3 h-3" />
                    View on GitHub
                  </a>
                )}

                {/* Prompt to load code if not yet loaded */}
                {!code && !codeLoading && (
                  <button
                    onClick={() => setTab("code")}
                    className="text-[11px] text-blue-500 hover:text-blue-400 transition-colors text-left"
                  >
                    → Open Code tab for full analysis
                  </button>
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
                    <p className="text-[10px] text-[#3A3A44] mt-1">May still import external packages</p>
                  </div>
                )}

                {/* External packages — only shown once code is loaded */}
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
                {dependentNodes.length > 0 ? (
                  <>
                    <p className="text-[10px] text-[#6A6A7A]">
                      {dependentNodes.length} file{dependentNodes.length !== 1 ? "s" : ""} import this
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {dependentNodes.map((n) => (
                        <NodeLink key={n.id} node={n} onClick={() => onNodeSelect?.(n.id)} />
                      ))}
                    </div>
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
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-[#6A6A7A]">
                        <span>{symbols.lineCount} lines</span>
                        <span className="text-[#3A3A4A]">·</span>
                        <span>{symbols.codeLines} code</span>
                        <span className="text-[#3A3A4A]">·</span>
                        <span>{symbols.commentLines} comments</span>
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

                    <CodeViewer code={code} />

                    {/* Symbols summary */}
                    {(symbols.exports.length > 0 || symbols.functions.length > 0 ||
                      symbols.classes.length > 0 || symbols.types.length > 0 || symbols.externalImports.length > 0) && (
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
                              {symbols.functions.slice(0, 10).map((f) => <SymbolTag key={f} label={`${f}()`} variant="fn" />)}
                              {symbols.functions.length > 10 && (
                                <span className="text-[9px] text-[#4A4A5A] self-center">+{symbols.functions.length - 10}</span>
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
                            <p className="text-[9px] text-[#4A4A5A] mb-1">External packages ({symbols.externalImports.length})</p>
                            <div className="flex flex-wrap gap-1">
                              {symbols.externalImports.map((pkg) => <SymbolTag key={pkg} label={pkg} variant="pkg" />)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

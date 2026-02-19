"use client";

import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  Handle,
  Position,
  PanOnScrollMode,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  FileCode,
  Folder,
  Search,
  X,
  BarChart2,
  Maximize2,
  Network,
  GitBranch,
  Zap,
} from "lucide-react";
import type { GraphNode, GraphEdge } from "@/lib/graph-builder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

type ViewMode = "graph" | "tree";

// ─── Language colours (shared with nodes) ────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#4A9EFF",
  JavaScript: "#F5D440",
  Python: "#4AA8D8",
  Go: "#00CED8",
  Rust: "#E8A87C",
  Ruby: "#E8605A",
  Java: "#F0A030",
  "C#": "#40C060",
  "C++": "#E8608A",
  C: "#9090AA",
};

// ─── Custom node: file/folder ─────────────────────────────────────────────────

const IMPACT_STYLES: Record<number, { border: string; bg: string; text: string; dot: string; glow: string; badge: string; badgeBg: string }> = {
  1: { border: "border-red-500/80", bg: "bg-red-500/15", text: "text-red-200", dot: "#ef4444", glow: "#ef444450", badge: "direct", badgeBg: "bg-red-500/20 text-red-400" },
  2: { border: "border-orange-400/70", bg: "bg-orange-400/12", text: "text-orange-200", dot: "#f97316", glow: "#f9731650", badge: "+2", badgeBg: "bg-orange-400/20 text-orange-400" },
  3: { border: "border-amber-400/55", bg: "bg-amber-400/10", text: "text-amber-200/85", dot: "#eab308", glow: "#eab30840", badge: "+3", badgeBg: "bg-amber-400/20 text-amber-400" },
};
const IMPACT_FAR = { border: "border-amber-400/40", bg: "bg-amber-400/8", text: "text-amber-300/70", dot: "#ca8a04", glow: "#ca8a0430", badge: "far", badgeBg: "bg-amber-400/15 text-amber-500" };

function CustomNode({
  data,
}: {
  data: {
    label: string;
    type: string;
    language?: string;
    role?: string;
    selected?: boolean;
    dimmed?: boolean;
    impactLevel?: number; // blast radius: 1=direct importer, 2=2hops, etc.
  };
}) {
  const isFolder = data.type === "folder";
  const langColor = data.language ? (LANG_COLORS[data.language] ?? null) : null;
  const impact = data.impactLevel !== undefined
    ? (IMPACT_STYLES[Math.min(data.impactLevel, 3)] ?? IMPACT_FAR)
    : null;

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1, background: "transparent", border: "none", minWidth: 0, minHeight: 0 }} />
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono font-medium
          transition-all duration-150 cursor-pointer select-none
          ${
            data.selected
              ? "border-blue-400 bg-blue-500/25 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40"
              : impact
              ? `${impact.border} ${impact.bg} ${impact.text}`
              : data.dimmed
              ? "border-[#1E1E26] bg-[#0D0D12] text-[#2E2E3A]"
              : "border-[#38384A] bg-[#16161E] text-[#D0D0E0] hover:border-[#5050A0] hover:bg-[#1E1E2A] hover:text-white"
          }
        `}
        title={data.role ?? data.label}
        style={{ maxWidth: 240 }}
      >
        {/* Impact level dot (replaces lang dot in blast mode) */}
        {impact ? (
          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: impact.dot, boxShadow: `0 0 6px ${impact.glow}` }} />
        ) : langColor && !data.dimmed ? (
          <span className="w-2 h-2 rounded-full shrink-0 opacity-90" style={{ background: langColor, boxShadow: `0 0 6px ${langColor}60` }} />
        ) : null}
        {isFolder ? (
          <Folder className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
        ) : (
          !langColor && !impact && <FileCode className="w-3.5 h-3.5 text-[#6878A8] shrink-0" />
        )}
        <span className="truncate leading-tight">{data.label}</span>
        {/* Impact hop badge */}
        {impact && (
          <span className={`ml-auto shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${impact.badgeBg}`}>
            {impact.badge}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1, background: "transparent", border: "none", minWidth: 0, minHeight: 0 }} />
    </>
  );
}

// ─── Custom node: directory (tree view) ──────────────────────────────────────

function TreeDirNode({ data }: { data: { label: string } }) {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, width: 1, height: 1, background: "transparent", border: "none", minWidth: 0, minHeight: 0 }} />
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#1A1A28] border-2 border-[#505080] rounded-lg text-sm font-bold text-[#C0C0E0] select-none tracking-wide" style={{ minWidth: 130 }}>
        <Folder className="w-4 h-4 text-yellow-300 shrink-0" />
        <span className="truncate">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1, background: "transparent", border: "none", minWidth: 0, minHeight: 0 }} />
    </>
  );
}

const nodeTypes = { custom: CustomNode, treeDir: TreeDirNode };

// ─── Helpers: graph layout ─────────────────────────────────────────────────────

function buildConnectedSet(nodeId: string, edges: GraphEdge[]): Set<string> {
  const s = new Set<string>();
  s.add(nodeId);
  for (const e of edges) {
    if (e.source === nodeId) s.add(e.target);
    if (e.target === nodeId) s.add(e.source);
  }
  return s;
}

// BFS on reversed graph: find every file that (directly or transitively) imports nodeId.
// Returns a Map of nodeId → hop distance (0 = the node itself).
function buildBlastRadius(nodeId: string, edges: GraphEdge[]): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: [string, number][] = [[nodeId, 0]];
  while (queue.length) {
    const [id, d] = queue.shift()!;
    if (dist.has(id)) continue;
    dist.set(id, d);
    for (const e of edges) {
      if (e.target === id && !dist.has(e.source)) {
        queue.push([e.source, d + 1]);
      }
    }
  }
  return dist;
}

function toGraphNodes(
  graphNodes: GraphNode[],
  selectedId: string | null | undefined,
  connectedIds: Set<string> | undefined,
  searchQuery: string,
  langFilter: string | null,
  blastRadius?: Map<string, number>
): Node[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(graphNodes.length)));
  return graphNodes.map((n, i) => {
    const matchesSearch =
      !searchQuery ||
      n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang =
      !langFilter ||
      n.language?.toLowerCase() === langFilter.toLowerCase();
    const hidden = !matchesSearch || !matchesLang;
    const isSelected = n.id === selectedId;

    let isDimmed: boolean;
    let impactLevel: number | undefined;

    if (blastRadius) {
      const d = blastRadius.get(n.id);
      isDimmed = d === undefined;
      impactLevel = d !== undefined && d > 0 ? d : undefined; // d=0 is the selected node itself
    } else {
      isDimmed = !isSelected && !!selectedId && connectedIds !== undefined && !connectedIds.has(n.id);
      impactLevel = undefined;
    }

    return {
      id: n.id,
      type: "custom",
      position: { x: (i % cols) * 260, y: Math.floor(i / cols) * 84 },
      hidden,
      data: {
        label: n.label,
        type: n.type,
        language: n.language,
        role: n.role,
        selected: isSelected,
        dimmed: isDimmed,
        impactLevel,
      },
    };
  });
}

function toGraphEdges(
  graphEdges: GraphEdge[],
  selectedId: string | null | undefined,
  connectedIds: Set<string> | undefined,
  blastRadius?: Map<string, number>
): Edge[] {
  return graphEdges.map((e) => {
    if (blastRadius) {
      const srcDist = blastRadius.get(e.source);
      const tgtDist = blastRadius.get(e.target);
      if (srcDist === undefined || tgtDist === undefined) {
        return {
          id: e.id, source: e.source, target: e.target,
          style: { stroke: "#18181E", strokeWidth: 0.5, opacity: 0.12 },
          type: "smoothstep",
        };
      }
      // Color the edge by the lesser distance (closer to root = hotter color)
      const d = Math.min(srcDist, tgtDist);
      const color = d <= 1 ? "#ef4444" : d === 2 ? "#f97316" : "#eab308";
      return {
        id: e.id, source: e.source, target: e.target,
        style: { stroke: color, strokeWidth: d <= 1 ? 2 : 1.5, opacity: 0.75 },
        animated: d <= 1, // animate direct-import edges for emphasis
        type: "smoothstep",
      };
    }

    const isHighlighted =
      selectedId && (e.source === selectedId || e.target === selectedId);
    const isDimmed =
      selectedId &&
      !isHighlighted &&
      connectedIds !== undefined &&
      !connectedIds.has(e.source) &&
      !connectedIds.has(e.target);

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      style: {
        stroke: isHighlighted ? "#5B9FFF" : isDimmed ? "#1E1E28" : "#48486A",
        strokeWidth: isHighlighted ? 2 : 1,
        opacity: isDimmed ? 0.2 : 1,
      },
      type: "smoothstep",
    };
  });
}

// ─── Helpers: hierarchical tree layout ───────────────────────────────────────

interface DirTreeNode {
  id: string;
  name: string;
  isDir: boolean;
  children: DirTreeNode[];
  graphNode?: GraphNode;
}

function buildDirTree(graphNodes: GraphNode[]): DirTreeNode {
  const fileNodes = graphNodes.filter((n) => n.type !== "folder");
  const root: DirTreeNode = { id: "__root__", name: "root", isDir: true, children: [] };
  for (const gn of fileNodes) {
    const parts = gn.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const dirId = `__dir__${parts.slice(0, i + 1).join("/")}`;
      let found = cur.children.find((c) => c.id === dirId);
      if (!found) {
        found = { id: dirId, name: parts[i], isDir: true, children: [] };
        cur.children.push(found);
      }
      cur = found;
    }
    cur.children.push({ id: gn.id, name: gn.label, isDir: false, children: [], graphNode: gn });
  }
  return root;
}

const TREE_W = 200;
const TREE_H = 48;
const TREE_H_GAP = 32;
const TREE_V_GAP = 80;

function subtreeWidth(node: DirTreeNode): number {
  if (!node.children.length) return TREE_W;
  const total =
    node.children.reduce((s, c) => s + subtreeWidth(c), 0) +
    TREE_H_GAP * (node.children.length - 1);
  return Math.max(TREE_W, total);
}

function placeSubtree(
  node: DirTreeNode,
  cx: number,
  y: number,
  pos: Map<string, { x: number; y: number }>
) {
  pos.set(node.id, { x: cx - TREE_W / 2, y });
  if (!node.children.length) return;
  const total =
    node.children.reduce((s, c) => s + subtreeWidth(c), 0) +
    TREE_H_GAP * (node.children.length - 1);
  let lx = cx - total / 2;
  for (const child of node.children) {
    const cw = subtreeWidth(child);
    placeSubtree(child, lx + cw / 2, y + TREE_H + TREE_V_GAP, pos);
    lx += cw + TREE_H_GAP;
  }
}

function buildHierarchyLayout(
  graphNodes: GraphNode[],
  selectedId: string | null | undefined,
  search: string,
  langFilter: string | null,
  importEdges: GraphEdge[]
): { nodes: Node[]; edges: Edge[] } {
  const root = buildDirTree(graphNodes);
  const pos = new Map<string, { x: number; y: number }>();

  // Lay out each top-level child as its own subtree, spaced apart
  let cx = 0;
  for (const child of root.children) {
    const w = subtreeWidth(child);
    placeSubtree(child, cx + w / 2, 0, pos);
    cx += w + TREE_H_GAP * 3;
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function walk(node: DirTreeNode, parentId: string | null) {
    const p = pos.get(node.id);
    if (!p) return;

    if (node.isDir) {
      nodes.push({
        id: node.id,
        type: "treeDir",
        position: p,
        data: { label: node.name },
        selectable: false,
        connectable: false,
        draggable: false,
      });
    } else if (node.graphNode) {
      const gn = node.graphNode;
      const ms =
        !search ||
        gn.label.toLowerCase().includes(search.toLowerCase()) ||
        gn.id.toLowerCase().includes(search.toLowerCase());
      const ml = !langFilter || gn.language?.toLowerCase() === langFilter.toLowerCase();
      nodes.push({
        id: gn.id,
        type: "custom",
        position: p,
        hidden: !ms || !ml,
        data: {
          label: gn.label,
          type: gn.type,
          language: gn.language,
          role: gn.role,
          selected: gn.id === selectedId,
          dimmed: false,
        },
      });
    }

    // Branch edge: parent → this node
    if (parentId) {
      edges.push({
        id: `__branch__${parentId}--${node.id}`,
        source: parentId,
        target: node.id,
        type: "smoothstep",
        style: {
          stroke: node.isDir ? "#5050A0" : "#404068",
          strokeWidth: node.isDir ? 2 : 1.5,
          opacity: 0.9,
        },
      });
    }

    for (const child of node.children) walk(child, node.id);
  }

  for (const child of root.children) walk(child, null);

  // Overlay import edges for the selected node (dashed blue)
  if (selectedId) {
    for (const e of importEdges) {
      if (e.source === selectedId || e.target === selectedId) {
        edges.push({
          id: `__import__${e.id}`,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          style: {
            stroke: "#5B9FFF",
            strokeWidth: 2,
            strokeDasharray: "6 4",
            opacity: 0.85,
          },
          zIndex: 10,
        });
      }
    }
  }

  return { nodes, edges };
}

// ─── Stats panel ──────────────────────────────────────────────────────────────

function StatsPanel({
  nodes,
  edges,
  onClose,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
}) {
  const stats = useMemo(() => {
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    for (const e of edges) {
      incoming.set(e.target, (incoming.get(e.target) ?? 0) + 1);
      outgoing.set(e.source, (outgoing.get(e.source) ?? 0) + 1);
    }
    const fileNodes = nodes.filter((n) => n.type !== "folder");
    const mostImported = fileNodes
      .map((n) => ({ node: n, count: incoming.get(n.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const mostImporting = fileNodes
      .map((n) => ({ node: n, count: outgoing.get(n.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const orphans = fileNodes.filter(
      (n) => !incoming.has(n.id) && !outgoing.has(n.id)
    );
    return { mostImported, mostImporting, orphans };
  }, [nodes, edges]);

  return (
    <div className="absolute top-10 right-2 z-10 w-64 bg-[#111114] border border-[#2A2A2E] rounded-lg shadow-2xl overflow-hidden text-[11px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2A2A2E]">
        <span className="text-xs font-semibold text-white">Graph stats</span>
        <button onClick={onClose} className="text-[#4A4A5A] hover:text-white transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Files", value: nodes.filter((n) => n.type !== "folder").length, color: "text-white" },
            { label: "Dependencies", value: edges.length, color: "text-white" },
            { label: "Orphan files", value: stats.orphans.length, color: "text-yellow-400" },
            {
              label: "Avg. imports",
              value: nodes.filter((n) => n.type !== "folder").length > 0
                ? (edges.length / nodes.filter((n) => n.type !== "folder").length).toFixed(1)
                : "0",
              color: "text-white",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0B0B0C] rounded p-2">
              <p className="text-[#4A4A5A] mb-0.5">{label}</p>
              <p className={`font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {stats.mostImported.length > 0 && (
          <div>
            <p className="text-[#4A4A5A] uppercase tracking-wider mb-1.5">Most imported</p>
            <div className="space-y-1">
              {stats.mostImported.map(({ node, count }) => (
                <div key={node.id} className="flex items-center justify-between gap-2">
                  <span className="text-[#CCCCCC] truncate font-mono">{node.label}</span>
                  <span className="text-blue-400 shrink-0">{count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.mostImporting.length > 0 && (
          <div>
            <p className="text-[#4A4A5A] uppercase tracking-wider mb-1.5">Heaviest importers</p>
            <div className="space-y-1">
              {stats.mostImporting.map(({ node, count }) => (
                <div key={node.id} className="flex items-center justify-between gap-2">
                  <span className="text-[#CCCCCC] truncate font-mono">{node.label}</span>
                  <span className="text-orange-400 shrink-0">{count} deps</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.orphans.length > 0 && (
          <div>
            <p className="text-[#4A4A5A] uppercase tracking-wider mb-1.5">
              Isolated ({stats.orphans.length})
            </p>
            <div className="space-y-1">
              {stats.orphans.slice(0, 5).map((node) => (
                <div key={node.id} className="text-[#6A6A7A] font-mono truncate">{node.label}</div>
              ))}
              {stats.orphans.length > 5 && (
                <p className="text-[#4A4A5A]">+{stats.orphans.length - 5} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fit-view button ───────────────────────────────────────────────────────────

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() => fitView({ padding: 0.2, duration: 400 })}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#8888A8] hover:text-white bg-[#16161E] border border-[#38384A] rounded-lg transition-colors hover:border-[#5050A0]"
      title="Fit all nodes in view"
    >
      <Maximize2 className="w-3.5 h-3.5" />Fit
    </button>
  );
}

// ─── Language filter pills ─────────────────────────────────────────────────────

function LangFilter({
  languages,
  active,
  onChange,
}: {
  languages: string[];
  active: string | null;
  onChange: (lang: string | null) => void;
}) {
  if (languages.length < 2) return null;
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded-lg text-xs border transition-colors shrink-0 font-medium ${
          !active
            ? "border-blue-400/60 bg-blue-500/20 text-blue-300"
            : "border-[#38384A] text-[#7878A0] hover:text-white hover:border-[#5050A0]"
        }`}
      >
        All
      </button>
      {languages.map((lang) => {
        const color = LANG_COLORS[lang];
        return (
          <button
            key={lang}
            onClick={() => onChange(active === lang ? null : lang)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors shrink-0 font-medium ${
              active === lang
                ? "border-blue-400/60 bg-blue-500/20 text-blue-300"
                : "border-[#38384A] text-[#7878A0] hover:text-white hover:border-[#5050A0]"
            }`}
          >
            {color && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: color }} />}
            {lang}
          </button>
        );
      })}
    </div>
  );
}

// ─── View mode toggle ─────────────────────────────────────────────────────────

function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-[#0E0E16] border border-[#38384A] rounded-lg p-0.5">
      {(["graph", "tree"] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            mode === m
              ? "bg-[#252535] text-white shadow-sm"
              : "text-[#6868A0] hover:text-[#A0A0C8]"
          }`}
        >
          {m === "graph" ? (
            <><Network className="w-3.5 h-3.5" />Graph</>
          ) : (
            <><GitBranch className="w-3.5 h-3.5" />Tree</>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────

function GraphViewInner({
  nodes: graphNodes,
  edges: graphEdges,
  onNodeClick,
  selectedNodeId,
}: GraphViewProps) {
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [blastMode, setBlastMode] = useState(false);

  // Reset blast mode when selection changes
  const prevSelected = useRef(selectedNodeId);
  if (prevSelected.current !== selectedNodeId) {
    prevSelected.current = selectedNodeId;
    if (blastMode) setBlastMode(false);
  }

  const connectedIds = useMemo(
    () =>
      selectedNodeId
        ? buildConnectedSet(selectedNodeId, graphEdges)
        : undefined,
    [selectedNodeId, graphEdges]
  );

  const blastRadius = useMemo(
    () => (blastMode && selectedNodeId) ? buildBlastRadius(selectedNodeId, graphEdges) : undefined,
    [blastMode, selectedNodeId, graphEdges]
  );

  const blastImpactCount = blastRadius ? blastRadius.size - 1 : 0; // exclude the node itself

  const languages = useMemo(() => {
    const langs = new Set<string>();
    for (const n of graphNodes) {
      if (n.language) langs.add(n.language);
    }
    return [...langs].sort();
  }, [graphNodes]);

  // Compute ReactFlow nodes/edges based on view mode
  const [rfNodes, rfEdges] = useMemo(() => {
    if (viewMode === "tree") {
      const { nodes, edges } = buildHierarchyLayout(
        graphNodes, selectedNodeId, search, langFilter, graphEdges
      );
      return [nodes, edges];
    }
    return [
      toGraphNodes(graphNodes, selectedNodeId, connectedIds, search, langFilter, blastRadius),
      toGraphEdges(graphEdges, selectedNodeId, connectedIds, blastRadius),
    ];
  }, [viewMode, graphNodes, selectedNodeId, connectedIds, search, langFilter, graphEdges, blastRadius]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
  const { fitView } = useReactFlow();

  // Sync computed nodes/edges into ReactFlow state
  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes, rfEdges]);

  // Fit view smoothly whenever viewMode changes or initial data loads
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.18, duration: 500 });
    }, 80);
    return () => clearTimeout(timer);
  }, [viewMode, fitView]);

  // Also fit when nodes first arrive
  useEffect(() => {
    if (rfNodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.18, duration: 400 });
      }, 120);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfNodes.length > 0]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = graphNodes.find((n) => n.id === node.id);
      if (graphNode && onNodeClick) onNodeClick(graphNode);
    },
    [graphNodes, onNodeClick]
  );

  const visibleNodeCount = nodes.filter((n) => !n.hidden && n.type !== "treeDir").length;

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0B0C]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2E] shrink-0 flex-wrap gap-y-1.5 bg-[#0E0E16]">
        {/* Search */}
        <div className="flex items-center gap-1.5 h-8 px-2.5 bg-[#16161E] border border-[#38384A] rounded-lg flex-1 min-w-36 max-w-56">
          <Search className="w-3.5 h-3.5 text-[#6868A0] shrink-0" />
          <input
            type="text"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-white placeholder:text-[#484868] outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#6868A0] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Language filter */}
        <LangFilter languages={languages} active={langFilter} onChange={setLangFilter} />

        {/* Right controls */}
        <div className="relative ml-auto flex items-center gap-1.5">
          {/* View toggle */}
          <ViewToggle mode={viewMode} onChange={setViewMode} />

          {/* Blast radius toggle — only when a node is selected and in graph mode */}
          {selectedNodeId && viewMode === "graph" && (
            <button
              onClick={() => setBlastMode((v) => !v)}
              title="Show all files that will be affected if this file changes"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-lg transition-colors font-medium ${
                blastMode
                  ? "border-red-500/60 bg-red-500/20 text-red-300 shadow-sm shadow-red-500/20"
                  : "border-[#38384A] text-[#8888A8] hover:text-white bg-[#16161E] hover:border-red-500/50 hover:text-red-400"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              {blastMode ? `Impact · ${blastImpactCount}` : "Impact"}
            </button>
          )}

          <button
            onClick={() => setShowStats((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs border rounded-lg transition-colors ${
              showStats
                ? "border-blue-400/50 bg-blue-500/15 text-blue-300"
                : "border-[#38384A] text-[#8888A8] hover:text-white bg-[#16161E] hover:border-[#5050A0]"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />Stats
          </button>

          <FitViewButton />

          {showStats && (
            <StatsPanel
              nodes={graphNodes}
              edges={graphEdges}
              onClose={() => setShowStats(false)}
            />
          )}
        </div>
      </div>

      {/* Blast radius legend */}
      {blastMode && selectedNodeId && (
        <div className="flex items-center gap-4 px-3 py-2 border-b border-red-900/40 bg-[#0E0808] shrink-0">
          <span className="text-xs text-red-400/80 font-medium flex items-center gap-1.5">
            <Zap className="w-3 h-3" />Change impact propagation
          </span>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-red-400"><span className="w-3 h-3 rounded-full bg-red-500" />Direct (1 hop)</span>
            <span className="flex items-center gap-1.5 text-orange-400"><span className="w-3 h-3 rounded-full bg-orange-400" />2 hops</span>
            <span className="flex items-center gap-1.5 text-amber-400"><span className="w-3 h-3 rounded-full bg-amber-400" />3+ hops</span>
          </div>
        </div>
      )}

      {/* Tree mode legend */}
      {viewMode === "tree" && (
        <div className="flex items-center gap-4 px-3 py-2 border-b border-[#2A2A3A] bg-[#0C0C14] shrink-0">
          <span className="text-xs text-[#6868A0]">
            Folder hierarchy · Click a file to inspect
          </span>
          <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-[#7878A0]">
              <span className="w-4 border-t-2 border-[#5050A0] inline-block" />
              Folder branch
            </span>
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-4 border-t-2 border-dashed border-blue-400 inline-block" />
              Imports (selected)
            </span>
          </div>
        </div>
      )}

      {/* Graph */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18, includeHiddenNodes: false }}
          minZoom={0.02}
          maxZoom={4}
          // Scroll/swipe = pan freely in any direction (like Figma/Maps)
          // Ctrl+scroll or pinch = zoom — no translateExtent cap
          panOnDrag
          panOnScroll
          panOnScrollMode={PanOnScrollMode.Free}
          zoomOnScroll={false}
          zoomOnPinch
          selectNodesOnDrag={false}
          elevateEdgesOnSelect
          translateExtent={[[-100000, -100000], [100000, 100000]]}
          className="bg-[#0B0B0C]"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#38384A"
            gap={24}
            size={1.5}
          />
          <Controls className="bg-[#16161E] border-[#38384A]" />
          <MiniMap
            nodeColor="#38385A"
            maskColor="rgba(10,10,16,0.85)"
            style={{ background: "#12121A", border: "1px solid #38384A" }}
          />
          <Panel
            position="bottom-left"
            className={`text-xs rounded-lg px-3 py-1.5 border transition-colors ${
              blastMode
                ? "text-red-300 bg-[#1A0A0A] border-red-500/40"
                : "text-[#8888A8] bg-[#12121A] border-[#38384A]"
            }`}
          >
            {blastMode && blastRadius ? (
              <>
                <span className="font-semibold text-red-300">{blastImpactCount} file{blastImpactCount !== 1 ? "s" : ""} affected</span>
                {" · "}
                <span className="text-red-500/80">{[...blastRadius.entries()].filter(([, d]) => d === 1).length} direct</span>
                {", "}
                <span className="text-orange-500/80">{[...blastRadius.entries()].filter(([, d]) => d >= 2).length} indirect</span>
              </>
            ) : search || langFilter ? (
              `${visibleNodeCount} of ${graphNodes.filter((n) => n.type !== "folder").length} files · ${graphEdges.length} deps`
            ) : (
              `${graphNodes.filter((n) => n.type !== "folder").length} files · ${graphEdges.length} deps`
            )}
            {selectedNodeId && !blastMode && (
              <span className="ml-2 text-[#6A6A7A]">
                · <kbd className="font-mono">Esc</kbd> to clear
              </span>
            )}
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}

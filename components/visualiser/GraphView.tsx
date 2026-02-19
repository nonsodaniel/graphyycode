"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import {
  FileCode,
  Folder,
  Search,
  X,
  BarChart2,
  Maximize2,
} from "lucide-react";
import type { GraphNode, GraphEdge } from "@/lib/graph-builder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

// ─── Tiny custom node ─────────────────────────────────────────────────────────

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
  };
}) {
  const isFolder = data.type === "folder";
  return (
    <div
      className={`
        flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono
        transition-all duration-150 cursor-pointer select-none
        ${
          data.selected
            ? "border-blue-500 bg-blue-600/20 text-white shadow-sm shadow-blue-500/30"
            : data.dimmed
            ? "border-[#2A2A2E]/40 bg-[#111114]/40 text-[#3A3A4A]"
            : "border-[#2A2A2E] bg-[#111114] text-[#8A8A9A] hover:border-[#3A3A4A] hover:text-white"
        }
      `}
      title={data.role ?? data.label}
      style={{ maxWidth: 120 }}
    >
      {isFolder ? (
        <Folder className="w-2.5 h-2.5 text-blue-400 shrink-0" />
      ) : (
        <FileCode className="w-2.5 h-2.5 text-[#6A6A7A] shrink-0" />
      )}
      <span className="truncate leading-tight">{data.label}</span>
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildConnectedSet(nodeId: string, edges: GraphEdge[]): Set<string> {
  const s = new Set<string>();
  s.add(nodeId);
  for (const e of edges) {
    if (e.source === nodeId) s.add(e.target);
    if (e.target === nodeId) s.add(e.source);
  }
  return s;
}

function toReactFlowNodes(
  graphNodes: GraphNode[],
  selectedId: string | null | undefined,
  connectedIds: Set<string> | undefined,
  searchQuery: string,
  langFilter: string | null
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
    const isDimmed =
      !isSelected &&
      !!selectedId &&
      connectedIds !== undefined &&
      !connectedIds.has(n.id);

    return {
      id: n.id,
      type: "custom",
      position: {
        x: (i % cols) * 140,
        y: Math.floor(i / cols) * 60,
      },
      hidden,
      data: {
        label: n.label,
        type: n.type,
        language: n.language,
        role: n.role,
        selected: isSelected,
        dimmed: isDimmed,
      },
    };
  });
}

function toReactFlowEdges(
  graphEdges: GraphEdge[],
  selectedId: string | null | undefined,
  connectedIds: Set<string> | undefined
): Edge[] {
  return graphEdges.map((e) => {
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
        stroke: isHighlighted ? "#3B82F6" : isDimmed ? "#1A1A1E" : "#2A2A2E",
        strokeWidth: isHighlighted ? 1.5 : 1,
        opacity: isDimmed ? 0.25 : 1,
      },
      type: "smoothstep",
    };
  });
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
        <button
          onClick={onClose}
          className="text-[#4A4A5A] hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#0B0B0C] rounded p-2">
            <p className="text-[#4A4A5A] mb-0.5">Files</p>
            <p className="text-white font-semibold">
              {nodes.filter((n) => n.type !== "folder").length}
            </p>
          </div>
          <div className="bg-[#0B0B0C] rounded p-2">
            <p className="text-[#4A4A5A] mb-0.5">Dependencies</p>
            <p className="text-white font-semibold">{edges.length}</p>
          </div>
          <div className="bg-[#0B0B0C] rounded p-2">
            <p className="text-[#4A4A5A] mb-0.5">Orphan files</p>
            <p className="text-yellow-400 font-semibold">{stats.orphans.length}</p>
          </div>
          <div className="bg-[#0B0B0C] rounded p-2">
            <p className="text-[#4A4A5A] mb-0.5">Avg. imports</p>
            <p className="text-white font-semibold">
              {nodes.filter((n) => n.type !== "folder").length > 0
                ? (
                    edges.length /
                    nodes.filter((n) => n.type !== "folder").length
                  ).toFixed(1)
                : "0"}
            </p>
          </div>
        </div>

        {stats.mostImported.length > 0 && (
          <div>
            <p className="text-[#4A4A5A] uppercase tracking-wider mb-1.5">
              Most imported
            </p>
            <div className="space-y-1">
              {stats.mostImported.map(({ node, count }) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[#CCCCCC] truncate font-mono">
                    {node.label}
                  </span>
                  <span className="text-blue-400 shrink-0">{count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.mostImporting.length > 0 && (
          <div>
            <p className="text-[#4A4A5A] uppercase tracking-wider mb-1.5">
              Heaviest importers
            </p>
            <div className="space-y-1">
              {stats.mostImporting.map(({ node, count }) => (
                <div
                  key={node.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-[#CCCCCC] truncate font-mono">
                    {node.label}
                  </span>
                  <span className="text-orange-400 shrink-0">{count} deps</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.orphans.length > 0 && (
          <div>
            <p className="text-[#4A4A5A] uppercase tracking-wider mb-1.5">
              Isolated files ({stats.orphans.length})
            </p>
            <div className="space-y-1">
              {stats.orphans.slice(0, 5).map((node) => (
                <div
                  key={node.id}
                  className="text-[#6A6A7A] font-mono truncate"
                >
                  {node.label}
                </div>
              ))}
              {stats.orphans.length > 5 && (
                <p className="text-[#4A4A5A]">
                  +{stats.orphans.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fit-view button (must render inside ReactFlow) ───────────────────────────

function FitViewButton() {
  const { fitView } = useReactFlow();
  return (
    <button
      onClick={() => fitView({ padding: 0.15, duration: 400 })}
      className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#8A8A9A] hover:text-white bg-[#111114] border border-[#2A2A2E] rounded transition-colors"
      title="Fit all nodes in view"
    >
      <Maximize2 className="w-3 h-3" />
      Fit
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
        className={`px-2 py-0.5 rounded text-[10px] border transition-colors shrink-0 ${
          !active
            ? "border-blue-500 bg-blue-600/20 text-blue-300"
            : "border-[#2A2A2E] text-[#4A4A5A] hover:text-white"
        }`}
      >
        All
      </button>
      {languages.map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(active === lang ? null : lang)}
          className={`px-2 py-0.5 rounded text-[10px] border transition-colors shrink-0 ${
            active === lang
              ? "border-blue-500 bg-blue-600/20 text-blue-300"
              : "border-[#2A2A2E] text-[#4A4A5A] hover:text-white"
          }`}
        >
          {lang}
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

  const connectedIds = useMemo(
    () =>
      selectedNodeId
        ? buildConnectedSet(selectedNodeId, graphEdges)
        : undefined,
    [selectedNodeId, graphEdges]
  );

  const languages = useMemo(() => {
    const langs = new Set<string>();
    for (const n of graphNodes) {
      if (n.language) langs.add(n.language);
    }
    return [...langs].sort();
  }, [graphNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    toReactFlowNodes(graphNodes, selectedNodeId, connectedIds, search, langFilter)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    toReactFlowEdges(graphEdges, selectedNodeId, connectedIds)
  );

  // Re-sync when filters or selection change
  useEffect(() => {
    setNodes(
      toReactFlowNodes(
        graphNodes,
        selectedNodeId,
        connectedIds,
        search,
        langFilter
      )
    );
    setEdges(toReactFlowEdges(graphEdges, selectedNodeId, connectedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNodes, graphEdges, selectedNodeId, connectedIds, search, langFilter]);

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

  const visibleNodeCount = nodes.filter((n) => !n.hidden).length;

  return (
    <div className="w-full h-full flex flex-col bg-[#0B0B0C]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2A2E] shrink-0 flex-wrap gap-y-1.5">
        {/* Search */}
        <div className="flex items-center gap-1.5 h-7 px-2 bg-[#111114] border border-[#2A2A2E] rounded flex-1 min-w-36 max-w-64">
          <Search className="w-3 h-3 text-[#4A4A5A] shrink-0" />
          <input
            type="text"
            placeholder="Search files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-[11px] text-white placeholder:text-[#3A3A4A] outline-none w-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[#4A4A5A] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Language filter pills */}
        <LangFilter
          languages={languages}
          active={langFilter}
          onChange={setLangFilter}
        />

        {/* Right controls */}
        <div className="relative ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowStats((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] border rounded transition-colors ${
              showStats
                ? "border-blue-500/50 bg-blue-600/10 text-blue-400"
                : "border-[#2A2A2E] text-[#4A4A5A] hover:text-white bg-[#111114]"
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            Stats
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
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={4}
          className="bg-[#0B0B0C]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#1E1E22"
            gap={20}
            size={1}
          />
          <Controls className="bg-[#111114] border-[#2A2A2E]" />
          <MiniMap
            nodeColor="#18181C"
            maskColor="rgba(11,11,12,0.85)"
            style={{ background: "#111114", border: "1px solid #2A2A2E" }}
          />
          <Panel
            position="bottom-left"
            className="text-[10px] text-[#4A4A5A] bg-[#111114] border border-[#2A2A2E] rounded px-2 py-1"
          >
            {search || langFilter
              ? `${visibleNodeCount} of ${graphNodes.length} files · ${graphEdges.length} deps`
              : `${graphNodes.length} files · ${graphEdges.length} deps`}
            {selectedNodeId && (
              <span className="ml-2 text-[#6A6A7A]">
                · click node again or press{" "}
                <kbd className="font-mono">Esc</kbd> to clear
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

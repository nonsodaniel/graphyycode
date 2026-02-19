"use client";

import { useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { FileCode, Folder } from "lucide-react";
import type { GraphNode, GraphEdge } from "@/lib/graph-builder";

interface GraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  selectedNodeId?: string | null;
}

function CustomNode({ data }: { data: { label: string; type: string; language?: string; role?: string; selected?: boolean } }) {
  const isFolder = data.type === "folder";
  return (
    <div
      className={`
        px-3 py-2 rounded-md border text-xs font-mono flex items-center gap-1.5 min-w-24 max-w-40
        transition-all duration-150
        ${data.selected
          ? "border-blue-500 bg-blue-600/15 text-white shadow-sm shadow-blue-500/20"
          : "border-[#2A2A2E] bg-[#111114] text-[#8A8A9A] hover:border-[#3A3A4A] hover:text-white"
        }
      `}
      title={data.role}
    >
      {isFolder
        ? <Folder className="w-3 h-3 text-blue-400 shrink-0" />
        : <FileCode className="w-3 h-3 text-[#8A8A9A] shrink-0" />
      }
      <span className="truncate">{data.label}</span>
    </div>
  );
}

const nodeTypes = { custom: CustomNode };

function toReactFlowNodes(
  graphNodes: GraphNode[],
  selectedId?: string | null
): Node[] {
  // Simple auto-layout in a grid
  const cols = Math.ceil(Math.sqrt(graphNodes.length));
  return graphNodes.map((n, i) => ({
    id: n.id,
    type: "custom",
    position: {
      x: (i % cols) * 200,
      y: Math.floor(i / cols) * 100,
    },
    data: {
      label: n.label,
      type: n.type,
      language: n.language,
      role: n.role,
      selected: n.id === selectedId,
    },
  }));
}

function toReactFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: "#2A2A2E", strokeWidth: 1 },
    type: "smoothstep",
  }));
}

export function GraphView({
  nodes: graphNodes,
  edges: graphEdges,
  onNodeClick,
  selectedNodeId,
}: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    toReactFlowNodes(graphNodes, selectedNodeId)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    toReactFlowEdges(graphEdges)
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = graphNodes.find((n) => n.id === node.id);
      if (graphNode && onNodeClick) onNodeClick(graphNode);

      // Update selected state in nodes
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, selected: n.id === node.id },
        }))
      );
    },
    [graphNodes, onNodeClick, setNodes]
  );

  return (
    <div className="w-full h-full bg-[#0B0B0C]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={3}
        className="bg-[#0B0B0C]"
      >
        <Background variant={BackgroundVariant.Dots} color="#2A2A2E" gap={24} size={1} />
        <Controls className="bg-[#111114] border-[#2A2A2E]" />
        <MiniMap
          nodeColor="#18181C"
          maskColor="rgba(11,11,12,0.8)"
          style={{ background: "#111114", border: "1px solid #2A2A2E" }}
        />
        <Panel position="top-left" className="text-xs text-[#4A4A5A] bg-[#111114] border border-[#2A2A2E] rounded px-2 py-1">
          {graphNodes.length} files · {graphEdges.length} dependencies
        </Panel>
      </ReactFlow>
    </div>
  );
}

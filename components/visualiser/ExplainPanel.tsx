"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FileCode, Folder, GitBranch, ArrowRight } from "lucide-react";
import type { GraphNode } from "@/lib/graph-builder";

interface ExplainPanelProps {
  node: GraphNode | null;
  fileRoles: Record<string, string>;
  incomingCount?: number;
  outgoingCount?: number;
}

export function ExplainPanel({
  node,
  fileRoles,
  incomingCount = 0,
  outgoingCount = 0,
}: ExplainPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4">
      <p className="text-xs text-[#4A4A5A] font-medium uppercase tracking-wider">
        Explain
      </p>

      <AnimatePresence mode="wait">
        {node ? (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* File header */}
            <div className="flex items-start gap-2">
              {node.type === "folder"
                ? <Folder className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                : <FileCode className="w-5 h-5 text-[#8A8A9A] mt-0.5 shrink-0" />
              }
              <div>
                <p className="text-sm font-semibold text-white">{node.label}</p>
                <p className="text-xs text-[#4A4A5A] font-mono">{node.path}</p>
              </div>
            </div>

            {/* Language badge */}
            {node.language && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-[#8A8A9A]">{node.language}</span>
              </div>
            )}

            {/* Role explanation */}
            <div className="border border-[#2A2A2E] rounded-md p-3 bg-[#0B0B0C]">
              <p className="text-xs font-semibold text-white mb-1">Role</p>
              <p className="text-xs text-[#8A8A9A] leading-relaxed">
                {fileRoles[node.id] ?? node.role ?? "Module — A source code file"}
              </p>
            </div>

            {/* Dependency counts */}
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#2A2A2E] rounded-md p-3 bg-[#0B0B0C]">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowRight className="w-3 h-3 text-blue-400 rotate-180" />
                  <p className="text-xs font-semibold text-white">Imports from</p>
                </div>
                <p className="text-xl font-bold text-blue-400">{outgoingCount}</p>
              </div>
              <div className="border border-[#2A2A2E] rounded-md p-3 bg-[#0B0B0C]">
                <div className="flex items-center gap-1.5 mb-1">
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                  <p className="text-xs font-semibold text-white">Used by</p>
                </div>
                <p className="text-xl font-bold text-blue-400">{incomingCount}</p>
              </div>
            </div>

            {/* File size */}
            {node.size !== undefined && (
              <div className="text-xs text-[#4A4A5A]">
                Size: {node.size > 1024
                  ? `${(node.size / 1024).toFixed(1)} KB`
                  : `${node.size} B`
                }
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-40 text-center"
          >
            <GitBranch className="w-8 h-8 text-[#2A2A2E] mb-3" />
            <p className="text-xs text-[#4A4A5A]">
              Click a node in the graph to see its explanation
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

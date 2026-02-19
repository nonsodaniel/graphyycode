"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/lib/graph-builder";

interface FileTreeProps {
  tree: FileTreeNode;
  onFileClick?: (path: string) => void;
  selectedPath?: string | null;
}

function TreeNode({
  node,
  depth,
  onFileClick,
  selectedPath,
}: {
  node: FileTreeNode;
  depth: number;
  onFileClick?: (path: string) => void;
  selectedPath?: string | null;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = node.type === "dir" && node.children;
  const isSelected = selectedPath === node.path;

  if (node.name === "/") {
    // Render root's children directly
    return (
      <>
        {node.children?.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth}
            onFileClick={onFileClick}
            selectedPath={selectedPath}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          if (isDir) {
            setOpen((v) => !v);
          } else {
            onFileClick?.(node.path);
          }
        }}
        className={cn(
          "w-full flex items-center gap-1.5 py-0.5 px-2 text-xs rounded transition-colors text-left",
          isSelected
            ? "bg-blue-600/20 text-white"
            : "text-[#8A8A9A] hover:text-white hover:bg-[#18181C]"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {isDir ? (
          <>
            {open
              ? <ChevronDown className="w-3 h-3 shrink-0 text-[#4A4A5A]" />
              : <ChevronRight className="w-3 h-3 shrink-0 text-[#4A4A5A]" />
            }
            {open
              ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              : <Folder className="w-3.5 h-3.5 shrink-0 text-blue-400" />
            }
          </>
        ) : (
          <>
            <span className="w-3 h-3 shrink-0" />
            <File className="w-3.5 h-3.5 shrink-0 text-[#4A4A5A]" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && open && (
        <div>
          {node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ tree, onFileClick, selectedPath }: FileTreeProps) {
  return (
    <div className="overflow-y-auto h-full py-2">
      <p className="text-xs text-[#4A4A5A] font-medium uppercase tracking-wider px-3 mb-2">
        Files
      </p>
      <TreeNode
        node={tree}
        depth={0}
        onFileClick={onFileClick}
        selectedPath={selectedPath}
      />
    </div>
  );
}

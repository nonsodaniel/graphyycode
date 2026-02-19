"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  GitBranch,
  FileCode,
  Folder,
  Camera,
  CheckCircle,
  Loader2,
} from "lucide-react";

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const DEMO_REPO = "https://github.com/vercel/next.js";

const MOCK_NODES = [
  { id: "app", label: "app/", x: 40, y: 45, type: "folder" },
  { id: "api", label: "api/", x: 20, y: 72, type: "folder" },
  { id: "page", label: "page.tsx", x: 58, y: 72, type: "file" },
  { id: "layout", label: "layout.tsx", x: 78, y: 52, type: "file" },
  { id: "utils", label: "utils.ts", x: 18, y: 32, type: "file" },
  { id: "components", label: "components/", x: 55, y: 22, type: "folder" },
];

const MOCK_EDGES = [
  { from: "app", to: "api" },
  { from: "app", to: "page" },
  { from: "app", to: "layout" },
  { from: "components", to: "page" },
  { from: "utils", to: "api" },
];

const EXPLANATIONS: Record<string, { role: string; desc: string }> = {
  app: {
    role: "Root directory",
    desc: "The main application directory using Next.js App Router conventions. Contains all routes, layouts, and API handlers.",
  },
  api: {
    role: "API Routes",
    desc: "Server-side API handlers. Each file exports HTTP methods (GET, POST, etc.) processed on the server edge.",
  },
  page: {
    role: "Page component",
    desc: "The main page component rendered at the root route. A React Server Component by default in Next.js 13+.",
  },
  layout: {
    role: "Root layout",
    desc: "Wraps all pages in this segment. Persists across navigations without re-rendering — ideal for nav, providers.",
  },
  utils: {
    role: "Utility module",
    desc: "Shared helper functions used across the codebase. Exported from a single entry point for easy imports.",
  },
  components: {
    role: "UI components",
    desc: "Reusable React components. Organized by feature or type, these are imported across multiple page routes.",
  },
};

function NodeIcon({ type }: { type: string }) {
  if (type === "folder") return <Folder className="w-3 h-3 text-blue-400" />;
  return <FileCode className="w-3 h-3 text-[#8A8A9A]" />;
}

function GraphView({
  activeNode,
  onNodeClick,
  visible,
}: {
  activeNode: string | null;
  onNodeClick: (id: string) => void;
  visible: boolean;
}) {
  return (
    <div className="relative w-full h-full">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {MOCK_EDGES.map((edge, i) => {
          const from = MOCK_NODES.find((n) => n.id === edge.from)!;
          const to = MOCK_NODES.find((n) => n.id === edge.to)!;
          const isActive = activeNode === edge.from || activeNode === edge.to;
          return (
            <motion.line
              key={i}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                visible
                  ? { pathLength: 1, opacity: isActive ? 1 : 0.3 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{ duration: 0.6, delay: i * 0.08 }}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              stroke={isActive ? "#3B82F6" : "#2A2A2E"}
              strokeWidth={isActive ? 1.5 : 1}
            />
          );
        })}
      </svg>
      {MOCK_NODES.map((node, i) => {
        const isActive = activeNode === node.id;
        const isConnected =
          activeNode &&
          MOCK_EDGES.some(
            (e) =>
              (e.from === activeNode && e.to === node.id) ||
              (e.to === activeNode && e.from === node.id)
          );
        return (
          <motion.button
            key={node.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={
              visible
                ? {
                    opacity: 1,
                    scale: isActive ? 1.1 : 1,
                  }
                : { opacity: 0, scale: 0.5 }
            }
            transition={{ duration: 0.4, delay: visible ? i * 0.07 : 0 }}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            onClick={() => onNodeClick(node.id)}
          >
            <div
              className={`
                flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono
                transition-all duration-200
                ${
                  isActive
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : isConnected
                    ? "bg-[#18181C] border-[#3A3A3E] text-[#CCCCCC]"
                    : "bg-[#111114] border-[#2A2A2E] text-[#8A8A9A]"
                }
              `}
            >
              <NodeIcon type={node.type} />
              <span>{node.label}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function ExplanationPanel({
  nodeId,
  visible,
}: {
  nodeId: string | null;
  visible: boolean;
}) {
  const data = nodeId ? EXPLANATIONS[nodeId] : null;
  return (
    <div className="h-full border-l border-[#2A2A2E] p-4 flex flex-col gap-3">
      <p className="text-xs text-[#8A8A9A] font-medium uppercase tracking-wider">
        File explanation
      </p>
      <AnimatePresence mode="wait">
        {visible && data ? (
          <motion.div
            key={nodeId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-white">{data.role}</span>
            </div>
            <p className="text-xs text-[#8A8A9A] leading-relaxed">{data.desc}</p>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-[#4A4A5A]"
          >
            Click a node to see explanation
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressBar({ step }: { step: Step }) {
  const pct = (step / 5) * 100;
  return (
    <div className="w-full h-0.5 bg-[#2A2A2E] rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-blue-600 rounded-full"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}

const STEP_LABELS: Record<Step, string> = {
  0: "Paste a GitHub repo URL",
  1: "Analysing repository...",
  2: "Dependency graph ready",
  3: "Node selected — showing explanation",
  4: "Screenshot captured",
  5: "Analysis complete",
};

export function AnimationDemo() {
  const prefersReduced = useReducedMotion();
  const [step, setStep] = useState<Step>(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [screenshotDone, setScreenshotDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prefersReduced) {
      setStep(2);
      setActiveNode("app");
      return;
    }

    // Autoplay sequence
    const sequence: Array<{ delay: number; action: () => void }> = [
      {
        delay: 800,
        action: () => {
          // Typing animation for input
          let i = 0;
          const chars = DEMO_REPO.split("");
          const type = () => {
            if (i < chars.length) {
              setInputText(DEMO_REPO.slice(0, i + 1));
              i++;
              setTimeout(type, 35);
            } else {
              setTimeout(() => setStep(1), 400);
            }
          };
          type();
        },
      },
      {
        delay: 3500,
        action: () => setStep(2),
      },
      {
        delay: 5000,
        action: () => {
          setStep(3);
          setActiveNode("app");
        },
      },
      {
        delay: 6500,
        action: () => {
          setStep(4);
          setScreenshotDone(true);
        },
      },
      {
        delay: 8000,
        action: () => {
          setStep(5);
        },
      },
      // Reset
      {
        delay: 10000,
        action: () => {
          setStep(0);
          setActiveNode(null);
          setInputText("");
          setScreenshotDone(false);
        },
      },
    ];

    let totalDelay = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (const item of sequence) {
      totalDelay += item.delay;
      const t = setTimeout(item.action, totalDelay);
      timeouts.push(t);
    }

    // Loop
    intervalRef.current = setTimeout(() => {
      // handled by last sequence item that resets
    }, totalDelay + 500);

    return () => {
      timeouts.forEach(clearTimeout);
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [prefersReduced]);

  // Re-trigger loop when step resets to 0
  useEffect(() => {
    if (step === 0 && !prefersReduced) {
      // will trigger from the outer useEffect re-run when component remounts
    }
  }, [step, prefersReduced]);

  return (
    <section id="demo" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-3">
            Interactive Demo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            See it in action
          </h2>
          <p className="text-[#8A8A9A] max-w-xl mx-auto">
            Watch how GraphyyCode analyses a repository and builds an interactive visualisation.
          </p>
        </div>

        {/* Demo container */}
        <div className="border border-[#2A2A2E] rounded-xl overflow-hidden bg-[#111114]">
          {/* Window bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A2E] bg-[#0B0B0C]">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            <div className="flex-1 mx-4">
              <div className="h-5 rounded bg-[#18181C] border border-[#2A2A2E] flex items-center px-3">
                <span className="text-xs text-[#4A4A5A]">graphyycode.app</span>
              </div>
            </div>
          </div>

          {/* Step label */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {step === 1 && (
                  <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                )}
                {step >= 5 && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
                <span className="text-xs text-[#8A8A9A]">{STEP_LABELS[step]}</span>
              </div>
              <span className="text-xs text-[#4A4A5A]">Step {step + 1}/6</span>
            </div>
            <ProgressBar step={step} />
          </div>

          {/* Repo input row */}
          <div className="px-4 py-3 border-b border-[#2A2A2E]">
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded-md border border-[#2A2A2E] bg-[#0B0B0C] flex items-center px-3 overflow-hidden">
                <span className="text-sm font-mono text-[#8A8A9A] truncate">
                  {inputText || (
                    <span className="text-[#4A4A5A]">
                      https://github.com/owner/repository
                    </span>
                  )}
                  {step === 0 && inputText.length > 0 && (
                    <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                  )}
                </span>
              </div>
              <div
                className={`
                  h-9 px-4 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors
                  ${step >= 1 ? "bg-blue-600 text-white" : "bg-[#18181C] text-[#8A8A9A] border border-[#2A2A2E]"}
                `}
              >
                {step === 1 ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analysing
                  </>
                ) : (
                  <>
                    <GitBranch className="w-3 h-3" />
                    Visualise
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main demo area */}
          <div className="flex flex-col md:flex-row" style={{ minHeight: 320 }}>
            {/* Graph area */}
            <div className="flex-1 relative p-4 min-h-[260px] md:min-h-0">
              {step < 2 ? (
                <div className="h-full flex items-center justify-center">
                  {step === 1 ? (
                    <motion.div
                      className="flex flex-col items-center gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-xs text-[#8A8A9A]">
                        Fetching repository structure...
                      </p>
                      <div className="w-48 h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-600 rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: "85%" }}
                          transition={{ duration: 1.8, ease: "easeInOut" }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center text-[#4A4A5A]">
                      <GitBranch className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Paste a repo URL to visualise</p>
                    </div>
                  )}
                </div>
              ) : (
                <GraphView
                  activeNode={activeNode}
                  onNodeClick={(id) => {
                    setActiveNode(id);
                    setStep(3);
                  }}
                  visible={step >= 2}
                />
              )}

              {/* Screenshot flash overlay */}
              <AnimatePresence>
                {step === 4 && screenshotDone && (
                  <motion.div
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-white rounded pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Explanation panel */}
            <div className="md:w-52 bg-[#0B0B0C]">
              <ExplanationPanel
                nodeId={activeNode}
                visible={step >= 3}
              />
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="px-4 py-3 border-t border-[#2A2A2E] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#4A4A5A]">
                {MOCK_NODES.length} files · {MOCK_EDGES.length} dependencies
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {step >= 4 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 text-xs text-green-400"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Screenshot saved
                  </motion.div>
                )}
              </AnimatePresence>
              <div
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors
                  ${step >= 2 ? "border-[#2A2A2E] text-[#8A8A9A] hover:border-blue-500/50 cursor-pointer" : "border-[#1A1A1E] text-[#3A3A4A] cursor-default"}
                `}
              >
                <Camera className="w-3.5 h-3.5" />
                Screenshot
              </div>
            </div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="mt-8 flex justify-center gap-6 flex-wrap">
          {(Object.keys(STEP_LABELS) as unknown as Step[]).map((s) => (
            <div
              key={s}
              className={`flex items-center gap-2 text-xs transition-colors ${
                Number(s) === step ? "text-white" : "text-[#4A4A5A]"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${
                  Number(s) <= step
                    ? "border-blue-500 bg-blue-600/20 text-blue-400"
                    : "border-[#2A2A2E] text-[#4A4A5A]"
                }`}
              >
                {Number(s) + 1}
              </div>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

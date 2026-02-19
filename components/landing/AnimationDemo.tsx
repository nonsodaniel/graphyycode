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
  Link2,
  Braces,
  MousePointerClick,
  Share2,
} from "lucide-react";

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
    desc: "Reusable React components. Organised by feature or type, these are imported across multiple page routes.",
  },
};

// 6 steps: 0–5
const STEPS = [
  {
    icon: Link2,
    title: "Paste a repo URL",
    desc: "Enter any public GitHub repository URL. No login needed for your first 3 analyses.",
  },
  {
    icon: Loader2,
    title: "Fetching repository",
    desc: "GraphyyCode calls the GitHub API to retrieve your full file tree and source files.",
  },
  {
    icon: Braces,
    title: "Building dependency graph",
    desc: "Imports and exports are traced across all files to map every dependency relationship.",
  },
  {
    icon: MousePointerClick,
    title: "Graph is ready",
    desc: "An interactive node graph appears. Click any node to inspect its role in the codebase.",
  },
  {
    icon: FileCode,
    title: "File explanation",
    desc: "Each node reveals its file role, language, and how many other files import or export it.",
  },
  {
    icon: Share2,
    title: "Export & share",
    desc: "Take a screenshot of the graph and share it with your team on Twitter, LinkedIn, or Slack.",
  },
] as const;

type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

function NodeIcon({ type }: { type: string }) {
  if (type === "folder") return <Folder className="w-3 h-3 text-blue-400" />;
  return <FileCode className="w-3 h-3 text-[#8A8A9A]" />;
}

function SimGraph({
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
              initial={{ opacity: 0 }}
              animate={visible ? { opacity: isActive ? 1 : 0.25 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
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
          !!activeNode &&
          MOCK_EDGES.some(
            (e) =>
              (e.from === activeNode && e.to === node.id) ||
              (e.to === activeNode && e.from === node.id)
          );
        return (
          <motion.button
            key={node.id}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={visible ? { opacity: 1, scale: isActive ? 1.08 : 1 } : { opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.35, delay: visible ? i * 0.06 : 0 }}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            onClick={() => onNodeClick(node.id)}
          >
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono transition-all duration-200 ${
                isActive
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]"
                  : isConnected
                  ? "bg-[#18181C] border-[#3A3A3E] text-[#CCCCCC]"
                  : "bg-[#111114] border-[#2A2A2E] text-[#8A8A9A]"
              }`}
            >
              <NodeIcon type={node.type} />
              {node.label}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function ExplainPanel({ nodeId, visible }: { nodeId: string | null; visible: boolean }) {
  const data = nodeId ? EXPLANATIONS[nodeId] : null;
  return (
    <div className="h-full border-l border-[#2A2A2E] p-4 flex flex-col gap-3 bg-[#0B0B0C]">
      <p className="text-xs text-[#8A8A9A] font-medium uppercase tracking-wider">File explanation</p>
      <AnimatePresence mode="wait">
        {visible && data ? (
          <motion.div
            key={nodeId}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-semibold text-white">{data.role}</span>
            </div>
            <p className="text-xs text-[#8A8A9A] leading-relaxed">{data.desc}</p>
            <div className="mt-2 pt-2 border-t border-[#2A2A2E] grid grid-cols-2 gap-2">
              <div className="bg-[#111114] rounded p-2">
                <p className="text-[10px] text-[#4A4A5A] mb-0.5">Imports</p>
                <p className="text-xs text-white font-mono">
                  {MOCK_EDGES.filter((e) => e.from === nodeId).length}
                </p>
              </div>
              <div className="bg-[#111114] rounded p-2">
                <p className="text-[10px] text-[#4A4A5A] mb-0.5">Used by</p>
                <p className="text-xs text-white font-mono">
                  {MOCK_EDGES.filter((e) => e.to === nodeId).length}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[#4A4A5A]">
            Click a node to see its explanation
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AnimationDemo() {
  const prefersReduced = useReducedMotion();
  const [step, setStep] = useState<StepIndex>(0);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [screenshotDone, setScreenshotDone] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const jumpTo = (s: StepIndex) => {
    clearAll();
    setStep(s);
    if (s >= 3) setActiveNode("app");
    if (s >= 4) setScreenshotDone(true);
    if (s < 3) setActiveNode(null);
    if (s < 4) setScreenshotDone(false);
    if (s === 0) setInputText("");
    else setInputText(DEMO_REPO);
  };

  // Auto-play sequence — re-runs on each cycleKey increment
  useEffect(() => {
    if (prefersReduced) {
      setStep(3);
      setActiveNode("app");
      setInputText(DEMO_REPO);
      return;
    }

    let delay = 0;
    const t = (ms: number, fn: () => void) => {
      delay += ms;
      const id = setTimeout(fn, delay);
      timeoutsRef.current.push(id);
    };

    // Step 0 → type URL character by character (80ms/char — visible, natural pace)
    t(1000, () => {
      let i = 0;
      const type = () => {
        if (i < DEMO_REPO.length) {
          setInputText(DEMO_REPO.slice(0, i + 1));
          i++;
          const id = setTimeout(type, 80);
          timeoutsRef.current.push(id);
        } else {
          const id = setTimeout(() => setStep(1), 1200);
          timeoutsRef.current.push(id);
        }
      };
      type();
    });

    // Step 1 — show fetching for 8s
    // offset = initial delay + typing duration + pause before step 1
    t(DEMO_REPO.length * 80 + 2200 + 8000, () => setStep(2));

    // Step 2 — show "building graph" for 7s
    t(7000, () => setStep(3));

    // Step 3 — graph is ready; let user admire it for 5s then auto-select a node
    t(5000, () => {
      setActiveNode("app");
      setStep(4);
    });

    // Step 4 — show file explanation panel for 7s
    t(7000, () => setStep(5));

    // Step 5 — flash screenshot indicator after 1s
    t(1000, () => setScreenshotDone(true));

    // Hold on step 5 for 6s so user can read, then restart loop
    t(6000, () => {
      setStep(0);
      setActiveNode(null);
      setInputText("");
      setScreenshotDone(false);
      setCycleKey((k) => k + 1);
    });

    return clearAll;
  }, [cycleKey, prefersReduced]);

  const graphVisible = step >= 3;
  const explainVisible = step >= 4;

  return (
    <section id="demo" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-3">
            Interactive Demo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">See it in action</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Watch GraphyyCode analyse a real repository — or click any step to jump to it.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Step sidebar */}
          <div className="lg:w-64 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = step === i;
              const isDone = step > i;
              return (
                <button
                  key={i}
                  onClick={() => jumpTo(i as StepIndex)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all shrink-0 lg:shrink w-56 lg:w-auto ${
                    isActive
                      ? "border-blue-500/50 bg-blue-600/10"
                      : isDone
                      ? "border-[#2A2A2E] bg-[#111114] opacity-60"
                      : "border-[#1A1A1E] bg-[#0B0B0C] opacity-40 hover:opacity-70"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isActive
                        ? "border-blue-500 bg-blue-600/20"
                        : isDone
                        ? "border-[#3A3A3E] bg-[#2A2A2E]"
                        : "border-[#2A2A2E]"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive
                            ? `text-blue-400 ${i === 1 ? "animate-spin" : ""}`
                            : "text-[#4A4A5A]"
                        }`}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold mb-0.5 ${
                        isActive ? "text-white" : "text-[#8A8A9A]"
                      }`}
                    >
                      {s.title}
                    </p>
                    <AnimatePresence>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[11px] text-[#8A8A9A] leading-relaxed overflow-hidden"
                        >
                          {s.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main simulation window */}
          <div className="flex-1 border border-[#2A2A2E] rounded-xl overflow-hidden bg-[#111114] min-w-0">
            {/* Window chrome */}
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
              {/* Loop indicator */}
              <div className="flex items-center gap-1 text-[10px] text-[#4A4A5A]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                live demo
              </div>
            </div>

            {/* URL input row */}
            <div className="px-4 py-3 border-b border-[#2A2A2E]">
              <div className="flex gap-2">
                <div className="flex-1 h-9 rounded-md border border-[#2A2A2E] bg-[#0B0B0C] flex items-center px-3 overflow-hidden">
                  <span className="text-sm font-mono text-[#8A8A9A] truncate">
                    {inputText || (
                      <span className="text-[#3A3A4A]">
                        https://github.com/owner/repository
                      </span>
                    )}
                    {step === 0 && inputText.length > 0 && (
                      <span className="inline-block w-0.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse align-middle" />
                    )}
                  </span>
                </div>
                <div
                  className={`h-9 px-4 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${
                    step >= 1
                      ? "bg-blue-600 text-white"
                      : "bg-[#18181C] text-[#8A8A9A] border border-[#2A2A2E]"
                  }`}
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

            {/* Main visualiser area */}
            <div className="flex flex-col sm:flex-row" style={{ minHeight: 280 }}>
              {/* Graph panel */}
              <div className="flex-1 relative p-4 min-h-[240px] sm:min-h-0">
                {/* Steps 0–1: empty / loading states */}
                {step < 2 && (
                  <div className="h-full flex items-center justify-center">
                    {step === 1 ? (
                      <motion.div
                        className="flex flex-col items-center gap-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <p className="text-xs text-[#8A8A9A]">Fetching repository structure…</p>
                        <div className="w-44 h-1.5 bg-[#2A2A2E] rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-600 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "85%" }}
                            transition={{ duration: 7, ease: "easeInOut" }}
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
                )}

                {/* Step 2: building graph */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex items-center justify-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-blue-500"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-[#8A8A9A]">Building dependency graph…</p>
                      <div className="text-[10px] text-[#4A4A5A] text-center space-y-0.5">
                        <p>✓ 88 files found</p>
                        <p>✓ Tracing import chains</p>
                        <motion.p
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.4 }}
                        >
                          ⟳ Resolving aliases…
                        </motion.p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Steps 3+: graph */}
                {step >= 3 && (
                  <SimGraph
                    activeNode={activeNode}
                    onNodeClick={(id) => {
                      setActiveNode(id);
                      setStep(4);
                    }}
                    visible={graphVisible}
                  />
                )}

                {/* Screenshot flash */}
                <AnimatePresence>
                  {step === 5 && screenshotDone && (
                    <motion.div
                      initial={{ opacity: 0.7 }}
                      animate={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 bg-white pointer-events-none"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Explanation sidebar */}
              <div className="sm:w-52 bg-[#0B0B0C] border-t sm:border-t-0">
                <ExplainPanel nodeId={activeNode} visible={explainVisible} />
              </div>
            </div>

            {/* Status bar */}
            <div className="px-4 py-2.5 border-t border-[#2A2A2E] flex items-center justify-between bg-[#0B0B0C]">
              <span className="text-[10px] text-[#4A4A5A]">
                {step >= 3
                  ? `${MOCK_NODES.length} files · ${MOCK_EDGES.length} dependencies`
                  : "graphyycode.app — codebase visualiser"}
              </span>
              <AnimatePresence mode="wait">
                {step >= 5 && screenshotDone ? (
                  <motion.div
                    key="saved"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-[10px] text-green-400"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Screenshot saved
                  </motion.div>
                ) : step >= 3 ? (
                  <motion.button
                    key="btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#2A2A2E] text-[10px] text-[#8A8A9A] hover:border-blue-500/40 transition-colors"
                    onClick={() => {
                      setStep(5);
                      setScreenshotDone(true);
                    }}
                  >
                    <Camera className="w-3 h-3" />
                    Screenshot
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

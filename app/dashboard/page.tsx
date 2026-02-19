"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GitBranch,
  Network,
  Clock,
  ArrowRight,
  Loader2,
  Camera,
  LayoutDashboard,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { timeAgo } from "@/lib/time";
import { guestHistory, type GuestAnalysisRecord } from "@/lib/cache";

interface ServerAnalysis {
  id: string;
  status: string;
  createdAt: string;
  repo: {
    owner: string;
    name: string;
    fullName: string;
    language?: string;
    description?: string;
  };
  screenshots: Array<{ id: string }>;
}

function AnalysisCard({
  id,
  fullName,
  language,
  description,
  status,
  createdAt,
  screenshotCount,
  nodeCount,
  edgeCount,
}: {
  id: string;
  fullName: string;
  language?: string | null;
  description?: string | null;
  status: string;
  createdAt: string;
  screenshotCount?: number;
  nodeCount?: number;
  edgeCount?: number;
}) {
  const isCompleted = status === "COMPLETED";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#2A2A2E] bg-[#111114] rounded-lg p-4 hover:border-[#3A3A3E] transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{fullName}</p>
            {description && (
              <p className="text-xs text-[#8A8A9A] truncate">{description}</p>
            )}
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded border shrink-0 ${
            isCompleted
              ? "text-green-400 border-green-800 bg-green-900/20"
              : status === "FAILED"
              ? "text-red-400 border-red-800 bg-red-900/20"
              : "text-blue-400 border-blue-800 bg-blue-900/20"
          }`}
        >
          {status.toLowerCase()}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#4A4A5A] mb-4 flex-wrap">
        {language && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(createdAt)}
        </span>
        {screenshotCount != null && screenshotCount > 0 && (
          <span className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {screenshotCount} screenshot{screenshotCount !== 1 ? "s" : ""}
          </span>
        )}
        {nodeCount != null && (
          <span className="flex items-center gap-1">
            <Network className="w-3 h-3" />
            {nodeCount} nodes · {edgeCount} edges
          </span>
        )}
      </div>

      {isCompleted && (
        <Link
          href={`/visualiser?repo=https://github.com/${fullName}&analysisId=${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 transition-colors"
        >
          <Network className="w-3.5 h-3.5" />
          Open visualiser
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
}

function GuestBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 border border-[#2A2A2E] bg-[#111114] rounded-lg p-4">
      <HardDrive className="w-4 h-4 text-[#8A8A9A] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium mb-1">Browsing as guest</p>
        <p className="text-xs text-[#8A8A9A]">
          Your history is saved locally on this device.{" "}
          <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>{" "}
          to sync across devices and unlock unlimited analyses.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<ServerAnalysis[]>([]);
  const [guestAnalyses, setGuestAnalyses] = useState<GuestAnalysisRecord[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/history?page=${p}&limit=12`);
      if (res.status === 401) {
        // Not signed in — show local guest history
        setIsGuest(true);
        const local = await guestHistory.getAll();
        setGuestAnalyses(local);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setIsGuest(false);
      setAnalyses(data.analyses ?? []);
      setTotalPages(data.pagination?.pages ?? 1);
    } catch {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const items = isGuest ? guestAnalyses : analyses;
  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 border border-blue-600/20 rounded-md flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Dashboard</h1>
              <p className="text-xs text-[#8A8A9A]">Your analysis history</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHistory(page)}
              className="flex items-center gap-1.5 text-xs text-[#8A8A9A] hover:text-white transition-colors px-3 py-1.5 border border-[#2A2A2E] rounded-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <Link
              href="/"
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              + New analysis
            </Link>
          </div>
        </div>

        {/* Tabs — only show Feed tab for signed-in users */}
        {!isGuest && (
          <div className="flex gap-2 mb-8">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-white border-b-2 border-blue-500 pb-1"
            >
              History
            </Link>
            <Link
              href="/feed"
              className="text-sm font-medium text-[#8A8A9A] hover:text-white transition-colors pb-1"
            >
              Feed
            </Link>
          </div>
        )}

        {/* Guest notice */}
        {isGuest && !loading && <GuestBanner />}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : isEmpty ? (
          <div className="text-center py-16">
            <Network className="w-12 h-12 text-[#2A2A2E] mx-auto mb-4" />
            <p className="text-[#8A8A9A] text-sm mb-4">No analyses yet</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400"
            >
              Analyse your first repository
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : isGuest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guestAnalyses.map((a) => (
              <AnalysisCard
                key={a.id}
                id={a.id}
                fullName={a.repoFullName}
                language={a.language}
                description={a.description}
                status={a.status}
                createdAt={a.createdAt}
                nodeCount={a.nodeCount}
                edgeCount={a.edgeCount}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {analyses.map((a) => (
                <AnalysisCard
                  key={a.id}
                  id={a.id}
                  fullName={a.repo.fullName}
                  language={a.repo.language}
                  description={a.repo.description}
                  status={a.status}
                  createdAt={a.createdAt}
                  screenshotCount={a.screenshots.length}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs border border-[#2A2A2E] rounded-md text-[#8A8A9A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5 text-xs text-[#8A8A9A]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs border border-[#2A2A2E] rounded-md text-[#8A8A9A] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

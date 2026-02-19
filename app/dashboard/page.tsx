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
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { timeAgo } from "@/lib/time";

interface Analysis {
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
  screenshots: Array<{
    id: string;
    imageUrl?: string;
    shareToken?: string;
    createdAt: string;
  }>;
}

function AnalysisCard({ analysis }: { analysis: Analysis }) {
  const isCompleted = analysis.status === "COMPLETED";

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
            <p className="text-sm font-semibold text-white truncate">
              {analysis.repo.fullName}
            </p>
            {analysis.repo.description && (
              <p className="text-xs text-[#8A8A9A] truncate">{analysis.repo.description}</p>
            )}
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded border shrink-0 ${
            isCompleted
              ? "text-green-400 border-green-800 bg-green-900/20"
              : analysis.status === "FAILED"
              ? "text-red-400 border-red-800 bg-red-900/20"
              : "text-blue-400 border-blue-800 bg-blue-900/20"
          }`}
        >
          {analysis.status.toLowerCase()}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#4A4A5A] mb-4">
        {analysis.repo.language && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {analysis.repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(analysis.createdAt)}
        </span>
        {analysis.screenshots.length > 0 && (
          <span className="flex items-center gap-1">
            <Camera className="w-3 h-3" />
            {analysis.screenshots.length} screenshot{analysis.screenshots.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isCompleted && (
        <Link
          href={`/visualiser?repo=https://github.com/${analysis.repo.fullName}&analysisId=${analysis.id}`}
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

export default function DashboardPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
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
        window.location.href = "/auth/signin?callbackUrl=/dashboard";
        return;
      }
      const data = await res.json();
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

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 border border-blue-600/20 rounded-md flex items-center justify-center">
              <LayoutDashboard className="w-4.5 h-4.5 text-blue-500" />
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

        {/* Feed link */}
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

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        ) : analyses.length === 0 ? (
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
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {analyses.map((a) => (
                <AnalysisCard key={a.id} analysis={a} />
              ))}
            </div>

            {/* Pagination */}
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

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Network,
  Clock,
  ArrowRight,
  Loader2,
  Users,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { Navbar } from "@/components/landing/Navbar";
import { timeAgo } from "@/lib/time";

interface ActivityEvent {
  id: string;
  type: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  analysis?: {
    id: string;
    repo: {
      owner: string;
      name: string;
      fullName: string;
      language?: string;
    };
  } | null;
}

const EVENT_LABELS: Record<string, string> = {
  ANALYSED: "analysed",
  RE_ANALYSED: "re-analysed",
  SCREENSHOT: "captured a screenshot of",
  SHARED: "shared",
};

function EventCard({ event }: { event: ActivityEvent }) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 py-4 border-b border-[#2A2A2E] last:border-0"
    >
      <div className="w-8 h-8 rounded-full bg-[#18181C] border border-[#2A2A2E] flex items-center justify-center shrink-0 overflow-hidden">
        {event.user.image ? (
          <Image src={event.user.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full" />
        ) : (
          <span className="text-xs text-[#8A8A9A]">
            {(event.user.name ?? event.user.email ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-medium">{event.user.name ?? event.user.email ?? "Someone"}</span>
          {" "}
          <span className="text-[#8A8A9A]">{EVENT_LABELS[event.type] ?? event.type.toLowerCase()}</span>
          {event.analysis && (
            <>
              {" "}
              <Link
                href={`/visualiser?repo=https://github.com/${event.analysis.repo.fullName}&analysisId=${event.analysis.id}`}
                className="text-blue-400 hover:text-blue-300 transition-colors font-mono text-xs"
              >
                {event.analysis.repo.fullName}
              </Link>
            </>
          )}
        </p>
        <p className="text-xs text-[#4A4A5A] flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3" />
          {timeAgo(event.createdAt)}
          {event.analysis?.repo.language && (
            <span className="ml-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {event.analysis.repo.language}
            </span>
          )}
        </p>
      </div>
      {event.analysis && (
        <Link
          href={`/visualiser?repo=https://github.com/${event.analysis.repo.fullName}&analysisId=${event.analysis.id}`}
          className="text-[#4A4A5A] hover:text-white transition-colors shrink-0"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </motion.div>
  );
}

export default function FeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchFeed = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed?page=${p}&limit=20`);
      if (res.status === 401) {
        window.location.href = "/auth/signin?callbackUrl=/feed";
        return;
      }
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotalPages(data.pagination?.pages ?? 1);
    } catch {
      setError("Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(page);
  }, [page]);

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/10 border border-blue-600/20 rounded-md flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Feed</h1>
              <p className="text-xs text-[#8A8A9A]">Activity from people you follow</p>
            </div>
          </div>
          <button
            onClick={() => fetchFeed(page)}
            className="flex items-center gap-1.5 text-xs text-[#8A8A9A] hover:text-white transition-colors px-3 py-1.5 border border-[#2A2A2E] rounded-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#8A8A9A] hover:text-white transition-colors pb-1"
          >
            History
          </Link>
          <Link
            href="/feed"
            className="text-sm font-medium text-white border-b-2 border-blue-500 pb-1"
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
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Network className="w-12 h-12 text-[#2A2A2E] mx-auto mb-4" />
            <p className="text-[#8A8A9A] text-sm mb-2">Your feed is empty</p>
            <p className="text-xs text-[#4A4A5A] mb-6">
              Follow other developers to see their activity here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400"
            >
              Explore repositories
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="border border-[#2A2A2E] bg-[#111114] rounded-lg divide-y divide-[#2A2A2E] overflow-hidden px-4">
              {events.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
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

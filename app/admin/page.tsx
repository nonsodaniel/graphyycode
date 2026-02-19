"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Network,
  ScrollText,
  Shield,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { timeAgo } from "@/lib/time";

type AdminTab = "users" | "analyses" | "audit";

interface UserRecord {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: { analyses: number; following: number; followers: number };
}

interface AnalysisRecord {
  id: string;
  status: string;
  createdAt: string;
  repo: { owner: string; name: string; fullName: string; language?: string };
  user?: { id: string; name?: string | null; email?: string | null } | null;
}

interface AuditRecord {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  actor: { id: string; name?: string | null; email?: string | null };
  target?: { id: string; name?: string | null; email?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="border border-[#2A2A2E] bg-[#111114] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 bg-blue-600/10 border border-blue-600/20 rounded flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs text-[#8A8A9A]">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  async function fetchData(t: AdminTab) {
    setLoading(true);
    try {
      if (t === "users") {
        const res = await fetch("/api/admin/users?limit=50");
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/dashboard";
          return;
        }
        const data = await res.json();
        setUsers(data.users ?? []);
      } else if (t === "analyses") {
        const res = await fetch("/api/admin/analyses?limit=50");
        const data = await res.json();
        setAnalyses(data.analyses ?? []);
        setStats(data.stats ?? {});
      } else {
        const res = await fetch("/api/admin/audit-logs?limit=50");
        const data = await res.json();
        setAuditLogs(data.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(tab);
  }, [tab]);

  const handleRoleChange = async (userId: string, newRole: "USER" | "ADMIN") => {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setUsers((u) =>
      u.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
    );
  };

  const tabs = [
    { id: "users" as AdminTab, label: "Users", Icon: Users },
    { id: "analyses" as AdminTab, label: "Analyses", Icon: Network },
    { id: "audit" as AdminTab, label: "Audit logs", Icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      {/* Header */}
      <div className="border-b border-[#2A2A2E] bg-[#0B0B0C]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard" className="text-[#8A8A9A] hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-white">Admin Dashboard</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {tab === "analyses" && Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {["COMPLETED", "PENDING", "PROCESSING", "FAILED"].map((s) => (
              <StatCard
                key={s}
                label={s.toLowerCase()}
                value={stats[s] ?? 0}
                icon={<Network className="w-3.5 h-3.5 text-blue-500" />}
              />
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#2A2A2E] mb-6">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? "text-white border-blue-500"
                  : "text-[#8A8A9A] border-transparent hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={() => fetchData(tab)}
            className="ml-auto flex items-center gap-1.5 text-xs text-[#8A8A9A] hover:text-white transition-colors px-3 py-1.5 border border-[#2A2A2E] rounded-md mb-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Users table */}
            {tab === "users" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2E]">
                      {["User", "Email", "Role", "Analyses", "Joined"].map((h) => (
                        <th key={h} className="text-left text-xs text-[#4A4A5A] font-medium py-2 pr-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-[#1A1A1E] hover:bg-[#111114] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#18181C] border border-[#2A2A2E] overflow-hidden flex items-center justify-center">
                              {user.image ? (
                                <Image src={user.image} alt="" width={28} height={28} className="rounded-full" />
                              ) : (
                                <span className="text-xs text-[#8A8A9A]">
                                  {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-white">{user.name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A9A] font-mono text-xs">{user.email}</td>
                        <td className="py-3 pr-4">
                          <div className="relative inline-block">
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value as "USER" | "ADMIN")}
                              className="appearance-none bg-[#18181C] border border-[#2A2A2E] text-xs text-white rounded px-2 py-1 pr-6 cursor-pointer focus:outline-none focus:border-blue-500"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-[#8A8A9A] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A9A] text-xs">{user._count.analyses}</td>
                        <td className="py-3 text-[#4A4A5A] text-xs">{timeAgo(user.createdAt)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <p className="text-center py-12 text-[#4A4A5A] text-sm">No users found</p>
                )}
              </div>
            )}

            {/* Analyses table */}
            {tab === "analyses" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2E]">
                      {["Repository", "Status", "User", "Created"].map((h) => (
                        <th key={h} className="text-left text-xs text-[#4A4A5A] font-medium py-2 pr-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a) => (
                      <motion.tr
                        key={a.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-[#1A1A1E] hover:bg-[#111114] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/visualiser?repo=https://github.com/${a.repo.fullName}&analysisId=${a.id}`}
                            className="text-blue-400 hover:text-blue-300 font-mono text-xs transition-colors"
                          >
                            {a.repo.fullName}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded border ${
                            a.status === "COMPLETED" ? "text-green-400 border-green-800" :
                            a.status === "FAILED" ? "text-red-400 border-red-800" :
                            "text-blue-400 border-blue-800"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A9A] text-xs">
                          {a.user?.email ?? "Guest"}
                        </td>
                        <td className="py-3 text-[#4A4A5A] text-xs">{timeAgo(a.createdAt)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {analyses.length === 0 && (
                  <p className="text-center py-12 text-[#4A4A5A] text-sm">No analyses found</p>
                )}
              </div>
            )}

            {/* Audit logs */}
            {tab === "audit" && (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border border-[#2A2A2E] bg-[#111114] rounded-md p-3 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-blue-400">{log.action}</span>
                        <span className="text-xs text-[#4A4A5A]">on</span>
                        <span className="text-xs text-white">{log.resource}</span>
                        <span className="text-xs text-[#4A4A5A]">by</span>
                        <span className="text-xs text-[#8A8A9A]">{log.actor.email ?? log.actor.name}</span>
                        {log.target && (
                          <>
                            <span className="text-xs text-[#4A4A5A]">→</span>
                            <span className="text-xs text-[#8A8A9A]">{log.target.email ?? log.target.name}</span>
                          </>
                        )}
                      </div>
                      {log.metadata && (
                        <p className="text-xs text-[#4A4A5A] font-mono mt-0.5">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[#4A4A5A] shrink-0">{timeAgo(log.createdAt)}</span>
                  </motion.div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-center py-12 text-[#4A4A5A] text-sm">No audit logs</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

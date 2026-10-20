"use client";

import Link from "next/link";
import { GitBranch, LogIn } from "lucide-react";

export function AppNavbar({ isGuest }: { isGuest?: boolean }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#2A2A2E] bg-[#0B0B0C]/95 backdrop-blur-sm">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white font-semibold text-sm">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </div>
          GraphyyCode
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs text-[#8A8A9A] hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          {isGuest !== false && (
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors"
            >
              <LogIn className="w-3 h-3" />
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

"use client";

import Link from "next/link";
import { WifiOff, GitBranch } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[#0B0B0C] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-[#111114] border border-[#2A2A2E] rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-7 h-7 text-[#8A8A9A]" />
        </div>

        <div className="flex items-center gap-2 justify-center mb-4">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <GitBranch className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">GraphyyCode</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">You are offline</h1>
        <p className="text-[#8A8A9A] text-sm leading-relaxed mb-6">
          No internet connection detected. You can still view any previously
          loaded analyses that were cached on this device.
        </p>

        <div className="border border-[#2A2A2E] bg-[#111114] rounded-lg p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-white mb-2">Available offline:</p>
          <ul className="space-y-1">
            <li className="text-xs text-[#8A8A9A] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Previously loaded visualisations
            </li>
            <li className="text-xs text-[#8A8A9A] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Cached dashboard history
            </li>
            <li className="text-xs text-[#8A8A9A] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Saved screenshots
            </li>
          </ul>
          <p className="text-xs font-semibold text-white mt-3 mb-1">Not available offline:</p>
          <ul className="space-y-1">
            <li className="text-xs text-[#8A8A9A] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              New repository analysis
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-9 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            View cached analyses
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center h-9 px-4 border border-[#2A2A2E] text-[#8A8A9A] text-sm font-medium rounded-md hover:text-white hover:border-[#3A3A3E] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    </main>
  );
}

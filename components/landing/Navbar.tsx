"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#top-repos", label: "Top repos" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#0B0B0C]/95 border-b border-[#2A2A2E] backdrop-blur-sm" : "bg-transparent"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-white font-semibold text-lg">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-white" />
          </div>
          GraphyyCode
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[#8A8A9A] hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium text-white rounded-md transition-colors hover:bg-[#111114]"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium bg-blue-600 text-white rounded-md transition-colors hover:bg-blue-700"
          >
            Get started
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-[#2A2A2E] bg-[#0B0B0C]"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#8A8A9A] hover:text-white transition-colors py-1"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 flex flex-col gap-2 border-t border-[#2A2A2E]">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium text-white border border-[#2A2A2E] rounded-md transition-colors hover:bg-[#111114]"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium bg-blue-600 text-white rounded-md transition-colors hover:bg-blue-700"
                >
                  Get started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

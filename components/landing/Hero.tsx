"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function Hero() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");

  const handleVisualise = () => {
    if (repoUrl.trim()) {
      router.push(`/visualiser?repo=${encodeURIComponent(repoUrl.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVisualise();
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-16 overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(42,42,46,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(42,42,46,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 border border-[#2A2A2E] bg-[#111114] rounded-full px-3 py-1 text-xs text-[#8A8A9A] mb-8"
        >
          <Github className="w-3 h-3" />
          Supports public GitHub repositories
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6"
        >
          Understand any codebase
          <br />
          <span className="text-blue-500">in minutes</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-[#8A8A9A] max-w-2xl mx-auto mb-10"
        >
          Paste a GitHub URL and instantly get an interactive dependency graph,
          folder tree, and file-by-file explanations. No setup required.
        </motion.p>

        {/* Input group */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-6"
        >
          <Input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://github.com/owner/repository"
            className="h-11 text-sm flex-1"
          />
          <Button
            onClick={handleVisualise}
            size="lg"
            className="h-11 px-6 gap-2 shrink-0"
          >
            Visualise
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Demo link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button
            onClick={() => {
              document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 text-sm text-[#8A8A9A] hover:text-white transition-colors"
          >
            <div className="w-6 h-6 rounded-full border border-[#2A2A2E] flex items-center justify-center">
              <Play className="w-3 h-3 fill-current" />
            </div>
            See demo
          </button>
        </motion.div>
      </div>
    </section>
  );
}

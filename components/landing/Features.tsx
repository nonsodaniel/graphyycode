"use client";

import { motion } from "framer-motion";
import {
  Network,
  FolderTree,
  FileSearch,
  Camera,
  Share2,
  History,
  Users,
  Shield,
  WifiOff,
} from "lucide-react";

const features = [
  {
    icon: Network,
    title: "Dependency graph",
    desc: "Interactive graph showing how files and modules relate to each other across your entire repository.",
  },
  {
    icon: FolderTree,
    title: "Folder tree",
    desc: "Navigate the repository structure visually. Understand project architecture at a glance.",
  },
  {
    icon: FileSearch,
    title: "File explanations",
    desc: "Heuristic-based analysis explains the role of each file — no AI hallucinations, pure logic.",
  },
  {
    icon: Camera,
    title: "Screenshot & share",
    desc: "Capture your graph view as a PNG. Share directly to Twitter, LinkedIn, or copy the link.",
  },
  {
    icon: History,
    title: "Analysis history",
    desc: "Every analysis is saved to your dashboard. Re-open any previous visualisation instantly.",
  },
  {
    icon: Users,
    title: "Follow & feed",
    desc: "Follow other developers and see their analysis activity in your personalised feed.",
  },
  {
    icon: Share2,
    title: "Top repos",
    desc: "Discover trending open-source repositories curated and ranked by the community.",
  },
  {
    icon: WifiOff,
    title: "Offline support",
    desc: "Install as a PWA and access previously loaded analyses without an internet connection.",
  },
  {
    icon: Shield,
    title: "Guest access",
    desc: "No signup needed for your first 3 analyses. Sign in to unlock unlimited history and sharing.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function Features() {
  return (
    <section id="features" className="py-24 px-4 border-t border-[#2A2A2E]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-3">
            Features
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to understand code
          </h2>
          <p className="text-[#8A8A9A] max-w-xl mx-auto">
            GraphyyCode gives you a complete set of tools to navigate, understand,
            and share any GitHub repository.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={itemVariants}
                className="border border-[#2A2A2E] bg-[#111114] rounded-lg p-5 hover:border-[#3A3A3E] transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600/10 border border-blue-600/20 rounded-md flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-xs text-[#8A8A9A] leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

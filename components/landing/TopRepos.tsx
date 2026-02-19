"use client";

import { motion } from "framer-motion";
import { Star, GitFork, ExternalLink } from "lucide-react";

const TOP_REPOS = [
  {
    owner: "vercel",
    name: "next.js",
    desc: "The React Framework for the Web",
    stars: "127k",
    forks: "27k",
    lang: "TypeScript",
    color: "#3B82F6",
  },
  {
    owner: "facebook",
    name: "react",
    desc: "The library for web and native user interfaces",
    stars: "228k",
    forks: "46k",
    lang: "JavaScript",
    color: "#F59E0B",
  },
  {
    owner: "microsoft",
    name: "vscode",
    desc: "Visual Studio Code source code",
    stars: "164k",
    forks: "30k",
    lang: "TypeScript",
    color: "#3B82F6",
  },
  {
    owner: "tailwindlabs",
    name: "tailwindcss",
    desc: "A utility-first CSS framework",
    stars: "82k",
    forks: "4.2k",
    lang: "CSS",
    color: "#06B6D4",
  },
  {
    owner: "prisma",
    name: "prisma",
    desc: "Next-generation ORM for Node.js & TypeScript",
    stars: "38k",
    forks: "1.5k",
    lang: "TypeScript",
    color: "#3B82F6",
  },
  {
    owner: "trpc",
    name: "trpc",
    desc: "End-to-end typesafe APIs made easy",
    stars: "35k",
    forks: "1.2k",
    lang: "TypeScript",
    color: "#3B82F6",
  },
];

export function TopRepos() {
  return (
    <section id="top-repos" className="py-24 px-4 border-t border-[#2A2A2E]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-3">
            Top repos
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Popular open-source projects
          </h2>
          <p className="text-[#8A8A9A] max-w-xl mx-auto">
            Jump straight in — these are the most analysed repositories. Click any to open a live visualisation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOP_REPOS.map((repo, i) => (
            <motion.a
              key={`${repo.owner}/${repo.name}`}
              href={`/visualiser?repo=${encodeURIComponent(`https://github.com/${repo.owner}/${repo.name}`)}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="group border border-[#2A2A2E] bg-[#111114] rounded-lg p-5 hover:border-[#3A3A3E] transition-colors flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[#8A8A9A]">{repo.owner}</p>
                  <h3 className="text-sm font-semibold text-white">{repo.name}</h3>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#4A4A5A] group-hover:text-[#8A8A9A] transition-colors" />
              </div>
              <p className="text-xs text-[#8A8A9A] leading-relaxed flex-1">{repo.desc}</p>
              <div className="flex items-center gap-4 text-xs text-[#4A4A5A]">
                <span className="flex items-center gap-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: repo.color }}
                  />
                  {repo.lang}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {repo.stars}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  {repo.forks}
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

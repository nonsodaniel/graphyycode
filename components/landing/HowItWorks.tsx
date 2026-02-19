"use client";

import { motion } from "framer-motion";
import { ClipboardPaste, Cpu, Network, Download } from "lucide-react";

const steps = [
  {
    icon: ClipboardPaste,
    step: "01",
    title: "Paste your repo URL",
    desc: "Copy any public GitHub repository URL and paste it into the input field. No configuration needed.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "We analyse it",
    desc: "Our worker fetches the repository, parses file structures, and builds a dependency map in seconds.",
  },
  {
    icon: Network,
    step: "03",
    title: "Explore the graph",
    desc: "An interactive graph renders instantly. Pan, zoom, and click nodes to explore relationships.",
  },
  {
    icon: Download,
    step: "04",
    title: "Save and share",
    desc: "Capture screenshots, save to your dashboard, and share your analysis with teammates.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 border-t border-[#2A2A2E]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            From URL to insight in seconds
          </h2>
        </div>

        <div className="relative">
          {/* Connector line — desktop only */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-[#2A2A2E]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full border-2 border-[#2A2A2E] bg-[#111114] flex items-center justify-center">
                      <Icon className="w-7 h-7 text-blue-500" />
                    </div>
                    <span className="absolute -top-1 -right-1 text-xs font-bold text-[#4A4A5A] bg-[#0B0B0C] border border-[#2A2A2E] rounded-full w-6 h-6 flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-xs text-[#8A8A9A] leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

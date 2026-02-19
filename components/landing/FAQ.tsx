"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is GraphyyCode free to use?",
    a: "Yes. Guest users get 3 free analyses without signing in. Sign in with your Google account for unlimited analyses, history saving, and sharing features.",
  },
  {
    q: "Which repositories are supported?",
    a: "Any public GitHub repository is supported. Private repository support is on the roadmap and will require GitHub OAuth with appropriate permissions.",
  },
  {
    q: "How accurate are the dependency graphs?",
    a: "GraphyyCode performs static analysis of import/require statements and file references. It works best for JavaScript, TypeScript, Python, and Go projects. Call graphs are best-effort based on function naming heuristics.",
  },
  {
    q: "How long does analysis take?",
    a: "Most repositories are analysed within 5–30 seconds depending on size. Large monorepos may take up to 60 seconds. Results are cached so subsequent views are instant.",
  },
  {
    q: "Can I use GraphyyCode offline?",
    a: "Yes. Install GraphyyCode as a PWA from your browser. Previously loaded analyses are cached and available offline. New analyses require an internet connection.",
  },
  {
    q: "Is there an API?",
    a: "A public REST API is planned. For now, all analysis is done through the web interface. If you're interested in API access, reach out via GitHub issues.",
  },
  {
    q: "How do I share an analysis?",
    a: "After analysis completes, use the Screenshot button to capture the graph view. You can download as PNG, copy to clipboard, or share directly to Twitter, LinkedIn, and Facebook.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#2A2A2E]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 text-left group"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors pr-4">
          {q}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[#8A8A9A] shrink-0" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-[#8A8A9A] leading-relaxed pb-5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="py-24 px-4 border-t border-[#2A2A2E]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently asked questions
          </h2>
        </div>
        <div>
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

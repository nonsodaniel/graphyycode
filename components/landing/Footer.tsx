import Link from "next/link";
import { GitBranch, Github, Twitter } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[#2A2A2E] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-semibold">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <GitBranch className="w-3.5 h-3.5 text-white" />
              </div>
              GraphyyCode
            </Link>
            <p className="text-xs text-[#8A8A9A] max-w-xs leading-relaxed">
              A codebase visualiser for developers. Understand any GitHub repository in minutes.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://github.com/nonsodaniel/graphyycode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8A8A9A] hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8A8A9A] hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">
                Product
              </p>
              <div className="flex flex-col gap-2">
                {["Features", "How it works", "Top repos", "Changelog"].map((l) => (
                  <a
                    key={l}
                    href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                    className="text-xs text-[#8A8A9A] hover:text-white transition-colors"
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">
                Legal
              </p>
              <div className="flex flex-col gap-2">
                {["Privacy", "Terms", "Cookies"].map((l) => (
                  <a
                    key={l}
                    href="#"
                    className="text-xs text-[#8A8A9A] hover:text-white transition-colors"
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white mb-3 uppercase tracking-wider">
                Open source
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://github.com/nonsodaniel/graphyycode"
                  className="text-xs text-[#8A8A9A] hover:text-white transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://github.com/nonsodaniel/graphyycode/issues"
                  className="text-xs text-[#8A8A9A] hover:text-white transition-colors"
                >
                  Issues
                </a>
                <a
                  href="https://github.com/nonsodaniel/graphyycode/discussions"
                  className="text-xs text-[#8A8A9A] hover:text-white transition-colors"
                >
                  Discussions
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#2A2A2E] flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-[#4A4A5A]">
            &copy; {year} GraphyyCode. All rights reserved.
          </p>
          <p className="text-xs text-[#4A4A5A]">
            Built with Next.js &amp; TypeScript
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Download,
  Copy,
  Share2,
  Twitter,
  Linkedin,
  Facebook,
  Link2,
  CheckCircle,
  Loader2,
  X,
} from "lucide-react";

interface ScreenshotButtonProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  analysisId?: string;
  repoFullName?: string;
}

type CopyState = "idle" | "copying" | "copied";

async function captureElement(element: HTMLDivElement): Promise<string> {
  const { toPng } = await import("html-to-image");
  return toPng(element, {
    backgroundColor: "#0B0B0C",
    pixelRatio: 2,
    filter: (node) => {
      // Exclude ReactFlow controls and minimap from screenshot
      if (node instanceof Element) {
        if (
          node.classList.contains("react-flow__controls") ||
          node.classList.contains("react-flow__minimap") ||
          node.classList.contains("react-flow__panel")
        ) {
          return false;
        }
      }
      return true;
    },
  });
}

function ShareMenu({
  dataUrl,
  repoFullName,
  shareToken,
  onCopyLink,
  copyState,
  onClose,
}: {
  dataUrl: string;
  repoFullName?: string;
  shareToken?: string;
  onCopyLink: () => void;
  copyState: CopyState;
  onClose: () => void;
}) {
  const shareText = `Exploring ${repoFullName ?? "a codebase"} with GraphyyCode — visualise your GitHub repositories instantly!`;
  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : window.location.href;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.15 }}
      className="absolute bottom-full right-0 mb-2 w-56 border border-[#2A2A2E] bg-[#111114] rounded-lg shadow-xl p-2 z-50"
    >
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-xs font-medium text-white">Share</span>
        <button
          onClick={onClose}
          className="text-[#4A4A5A] hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        {/* Download PNG */}
        <a
          href={dataUrl}
          download={`graphyycode-${repoFullName?.replace("/", "-") ?? "analysis"}.png`}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs text-[#8A8A9A] hover:text-white hover:bg-[#18181C] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download PNG
        </a>

        {/* Copy to clipboard */}
        <button
          onClick={async () => {
            try {
              const res = await fetch(dataUrl);
              const blob = await res.blob();
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
            } catch {
              // fallback - just show copied
            }
          }}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs text-[#8A8A9A] hover:text-white hover:bg-[#18181C] transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          Copy image
        </button>

        <div className="h-px bg-[#2A2A2E] my-1" />

        {/* Twitter */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs text-[#8A8A9A] hover:text-white hover:bg-[#18181C] transition-colors"
        >
          <Twitter className="w-3.5 h-3.5" />
          Share on X/Twitter
        </a>

        {/* LinkedIn */}
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs text-[#8A8A9A] hover:text-white hover:bg-[#18181C] transition-colors"
        >
          <Linkedin className="w-3.5 h-3.5" />
          Share on LinkedIn
        </a>

        {/* Facebook */}
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded text-xs text-[#8A8A9A] hover:text-white hover:bg-[#18181C] transition-colors"
        >
          <Facebook className="w-3.5 h-3.5" />
          Share on Facebook
        </a>

        <div className="h-px bg-[#2A2A2E] my-1" />

        {/* Copy link */}
        <button
          onClick={onCopyLink}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs text-[#8A8A9A] hover:text-white hover:bg-[#18181C] transition-colors"
        >
          {copyState === "copied" ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Link2 className="w-3.5 h-3.5" />
          )}
          {copyState === "copied" ? "Link copied!" : "Copy link"}
        </button>
      </div>
    </motion.div>
  );
}

export function ScreenshotButton({
  targetRef,
  analysisId,
  repoFullName,
}: ScreenshotButtonProps) {
  const [capturing, setCapturing] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | undefined>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCapture = async () => {
    if (!targetRef.current) return;
    setCapturing(true);

    try {
      const png = await captureElement(targetRef.current);
      setDataUrl(png);

      // Save to API if authenticated and analysisId provided
      if (analysisId) {
        try {
          const res = await fetch("/api/screenshots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisId, imageData: png }),
          });
          if (res.ok) {
            const data = await res.json();
            setShareToken(data.shareToken);
          }
        } catch {
          // Non-fatal — screenshot still works locally
        }
      }

      setMenuOpen(true);
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setCapturing(false);
    }
  };

  const handleCopyLink = async () => {
    setCopyState("copying");
    const url = shareToken
      ? `${window.location.origin}/share/${shareToken}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("idle");
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={dataUrl && menuOpen ? () => setMenuOpen((v) => !v) : handleCapture}
        disabled={capturing}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-[#2A2A2E] text-[#8A8A9A] hover:text-white hover:border-[#3A3A3E] text-xs rounded-md transition-colors disabled:opacity-50"
      >
        {capturing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : dataUrl ? (
          <Share2 className="w-3.5 h-3.5" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        {capturing ? "Capturing..." : dataUrl ? "Share" : "Screenshot"}
      </button>

      <AnimatePresence>
        {menuOpen && dataUrl && (
          <ShareMenu
            dataUrl={dataUrl}
            repoFullName={repoFullName}
            shareToken={shareToken}
            onCopyLink={handleCopyLink}
            copyState={copyState}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

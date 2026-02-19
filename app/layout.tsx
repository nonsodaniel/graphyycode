import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { ServiceWorkerRegistrar } from "@/components/shared/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GraphyyCode — Codebase Visualiser",
  description:
    "Understand any GitHub repository in minutes. Visualise dependency graphs, folder trees, and call graphs instantly.",
  keywords: ["codebase visualiser", "github", "dependency graph", "code analysis"],
  authors: [{ name: "GraphyyCode" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "GraphyyCode — Codebase Visualiser",
    description: "Understand any GitHub repository in minutes.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GraphyyCode — Codebase Visualiser",
    description: "Understand any GitHub repository in minutes.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GraphyyCode",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0B0C] text-white`}
      >
        <ServiceWorkerRegistrar />
        <OfflineBanner />
        {children}
      </body>
    </html>
  );
}

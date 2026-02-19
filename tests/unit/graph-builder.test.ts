import { describe, it, expect } from "vitest";
import { buildGraph } from "@/lib/graph-builder";

const MOCK_FILES = [
  {
    path: "app/page.tsx",
    content: `
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
export default function Page() { return <><Navbar /><Hero /></>; }
    `,
  },
  {
    path: "components/Hero.tsx",
    content: `
import { Button } from "@/components/ui/button";
export function Hero() { return <Button>Click</Button>; }
    `,
  },
  {
    path: "components/Navbar.tsx",
    content: `
import Link from "next/link";
export function Navbar() { return <nav><Link href="/">Home</Link></nav>; }
    `,
  },
  {
    path: "components/ui/button.tsx",
    content: `export function Button({ children }) { return <button>{children}</button>; }`,
  },
  {
    path: "lib/utils.ts",
    content: `export function cn(...args) { return args.join(" "); }`,
  },
];

describe("buildGraph", () => {
  it("creates nodes for each file", () => {
    const { nodes } = buildGraph(MOCK_FILES);
    expect(nodes).toHaveLength(MOCK_FILES.length);
  });

  it("assigns correct labels from file names", () => {
    const { nodes } = buildGraph(MOCK_FILES);
    const pageNode = nodes.find((n) => n.path === "app/page.tsx");
    expect(pageNode?.label).toBe("page.tsx");
  });

  it("detects TypeScript language", () => {
    const { nodes } = buildGraph(MOCK_FILES);
    const node = nodes.find((n) => n.path === "lib/utils.ts");
    expect(node?.language).toBe("TypeScript");
  });

  it("creates edges from import statements", () => {
    const { edges } = buildGraph(MOCK_FILES);
    expect(edges.length).toBeGreaterThan(0);
  });

  it("creates edge from page.tsx to Hero", () => {
    const { edges } = buildGraph(MOCK_FILES);
    const hasEdge = edges.some(
      (e) => e.source === "app/page.tsx" && e.target === "components/Hero.tsx"
    );
    expect(hasEdge).toBe(true);
  });

  it("creates edge from Hero to button", () => {
    const { edges } = buildGraph(MOCK_FILES);
    const hasEdge = edges.some(
      (e) =>
        e.source === "components/Hero.tsx" &&
        e.target === "components/ui/button.tsx"
    );
    expect(hasEdge).toBe(true);
  });

  it("does not create edges to external packages (next/link)", () => {
    const { edges } = buildGraph(MOCK_FILES);
    const hasExternal = edges.some(
      (e) => e.target === "next/link" || e.source === "next/link"
    );
    expect(hasExternal).toBe(false);
  });

  it("builds a file tree", () => {
    const { fileTree } = buildGraph(MOCK_FILES);
    expect(fileTree.type).toBe("dir");
    expect(fileTree.children).toBeDefined();
    expect(fileTree.children!.length).toBeGreaterThan(0);
  });

  it("assigns file roles", () => {
    const { fileRoles } = buildGraph(MOCK_FILES);
    expect(fileRoles["app/page.tsx"]).toContain("Page");
  });

  it("handles files without content gracefully", () => {
    const filesWithoutContent = [
      { path: "public/icon.png" },
      { path: "styles/global.css" },
    ];
    const { nodes, edges } = buildGraph(filesWithoutContent);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(0);
  });
});

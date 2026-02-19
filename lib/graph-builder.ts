export interface GraphNode {
  id: string;
  label: string;
  type: "file" | "folder" | "external";
  path: string;
  language?: string;
  role?: string;
  size?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "import" | "require" | "export";
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileTreeNode[];
  language?: string;
}

export interface GraphArtifactData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  fileTree: FileTreeNode;
  fileRoles: Record<string, string>;
}

// Common import patterns per language
const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  ts: [
    /import\s+(?:.*?)\s+from\s+['"](.+?)['"]/gm,
    /require\(['"](.+?)['"]\)/gm,
    /export\s+(?:.*?)\s+from\s+['"](.+?)['"]/gm,
  ],
  tsx: [
    /import\s+(?:.*?)\s+from\s+['"](.+?)['"]/gm,
    /require\(['"](.+?)['"]\)/gm,
  ],
  js: [
    /import\s+(?:.*?)\s+from\s+['"](.+?)['"]/gm,
    /require\(['"](.+?)['"]\)/gm,
  ],
  jsx: [
    /import\s+(?:.*?)\s+from\s+['"](.+?)['"]/gm,
    /require\(['"](.+?)['"]\)/gm,
  ],
  py: [
    /^from\s+(\S+)\s+import/gm,
    /^import\s+(\S+)/gm,
  ],
};

// File role heuristics
const ROLE_HEURISTICS: Array<{ pattern: RegExp; role: string }> = [
  { pattern: /layout\.(tsx?|jsx?)$/, role: "Layout — Wraps all pages in this route segment" },
  { pattern: /page\.(tsx?|jsx?)$/, role: "Page — Renders the route UI" },
  { pattern: /route\.(tsx?|ts)$/, role: "API Route — Handles HTTP requests" },
  { pattern: /middleware\.(tsx?|ts)$/, role: "Middleware — Intercepts requests" },
  { pattern: /schema\.prisma$/, role: "Database Schema — Defines all data models" },
  { pattern: /\.(test|spec)\.(tsx?|jsx?|py)$/, role: "Test — Unit or integration tests" },
  { pattern: /index\.(tsx?|jsx?|py)$/, role: "Module index — Entry point for this directory" },
  { pattern: /hooks?\.(tsx?|ts)$/, role: "Custom hook — Reusable React logic" },
  { pattern: /context\.(tsx?|ts)$/, role: "React Context — Shared state provider" },
  { pattern: /store\.(tsx?|ts)$/, role: "State store — Application state management" },
  { pattern: /config\.(tsx?|ts|js)$/, role: "Configuration — App or tool settings" },
  { pattern: /types?\.(tsx?|ts)$/, role: "Type definitions — TypeScript interfaces" },
  { pattern: /utils?\.(tsx?|ts|js)$/, role: "Utilities — Helper functions" },
  { pattern: /constants?\.(tsx?|ts|js)$/, role: "Constants — Shared constant values" },
  { pattern: /providers?\.(tsx?|ts)$/, role: "Provider — Wraps app with context" },
  { pattern: /README\.md$/i, role: "Documentation — Project readme" },
  { pattern: /package\.json$/, role: "Package manifest — Dependencies and scripts" },
  { pattern: /\.env/, role: "Environment config — Runtime variables" },
];

function detectLanguage(filename: string): string | undefined {
  const ext = filename.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    py: "Python",
    go: "Go",
    rs: "Rust",
    rb: "Ruby",
    java: "Java",
    cs: "C#",
    cpp: "C++",
    c: "C",
    md: "Markdown",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
  };
  return ext ? langMap[ext] : undefined;
}

function inferFileRole(filePath: string): string {
  for (const { pattern, role } of ROLE_HEURISTICS) {
    if (pattern.test(filePath)) return role;
  }
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext && ["ts", "tsx", "js", "jsx"].includes(ext)) {
    return "Module — A JavaScript/TypeScript module";
  }
  return "File";
}

function extractImports(content: string, filePath: string): string[] {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "js";
  const patterns = IMPORT_PATTERNS[ext] ?? IMPORT_PATTERNS.js;
  const imports: string[] = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath && !importPath.startsWith("http")) {
        imports.push(importPath);
      }
    }
  }

  return [...new Set(imports)];
}

function resolveImportPath(
  importPath: string,
  fromFile: string,
  allPaths: string[]
): string | null {
  // Skip external packages (no ./ or ../ prefix, not @/ alias)
  if (
    !importPath.startsWith(".") &&
    !importPath.startsWith("@/") &&
    !importPath.startsWith("~/")
  ) {
    return null; // external dependency
  }

  // Handle @/ alias (Next.js root)
  if (importPath.startsWith("@/")) {
    const normalized = importPath.slice(2);
    const candidates = [
      normalized,
      `${normalized}.ts`,
      `${normalized}.tsx`,
      `${normalized}.js`,
      `${normalized}/index.ts`,
      `${normalized}/index.tsx`,
    ];
    for (const c of candidates) {
      if (allPaths.includes(c)) return c;
    }
    return null;
  }

  // Relative imports
  const fromDir = fromFile.split("/").slice(0, -1).join("/");
  const resolved = fromDir
    ? `${fromDir}/${importPath}`.replace(/\/\.\//g, "/")
    : importPath;

  const normalized = resolved.replace(/\/{2,}/g, "/").replace(/^\//, "");
  const candidates = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.js`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
  ];

  for (const c of candidates) {
    if (allPaths.includes(c)) return c;
  }
  return null;
}

interface GithubFile {
  path: string;
  content?: string;
  size?: number;
}

/**
 * Build a dependency graph from a list of repo files.
 */
export function buildGraph(files: GithubFile[]): GraphArtifactData {
  const allPaths = files.map((f) => f.path);

  // Build nodes
  const nodes: GraphNode[] = files.map((f) => ({
    id: f.path,
    label: f.path.split("/").pop() ?? f.path,
    type: "file",
    path: f.path,
    language: detectLanguage(f.path),
    role: inferFileRole(f.path),
    size: f.size,
  }));

  // Build edges from imports
  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const file of files) {
    if (!file.content) continue;
    const imports = extractImports(file.content, file.path);
    for (const imp of imports) {
      const resolved = resolveImportPath(imp, file.path, allPaths);
      if (resolved && resolved !== file.path) {
        const edgeKey = `${file.path}→${resolved}`;
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          edges.push({
            id: edgeKey,
            source: file.path,
            target: resolved,
            type: imp.includes("require") ? "require" : "import",
          });
        }
      }
    }
  }

  // Build file tree
  const fileTree = buildFileTree(allPaths);

  // Build file roles map
  const fileRoles: Record<string, string> = {};
  for (const f of files) {
    fileRoles[f.path] = inferFileRole(f.path);
  }

  return { nodes, edges, fileTree, fileRoles };
}

function buildFileTree(paths: string[]): FileTreeNode {
  const root: FileTreeNode = { name: "/", path: "", type: "dir", children: [] };

  for (const filePath of paths.sort()) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (!current.children) current.children = [];

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isLast ? "file" : "dir",
          children: isLast ? undefined : [],
          language: isLast ? detectLanguage(part) : undefined,
        };
        current.children.push(child);
      }
      current = child;
    }
  }

  return root;
}

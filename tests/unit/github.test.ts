import { describe, it, expect } from "vitest";
import { parseGitHubUrl } from "@/lib/github";

describe("parseGitHubUrl", () => {
  it("parses a standard GitHub URL", () => {
    const result = parseGitHubUrl("https://github.com/vercel/next.js");
    expect(result).toEqual({ owner: "vercel", name: "next.js" });
  });

  it("strips .git suffix from repo name", () => {
    const result = parseGitHubUrl("https://github.com/vercel/next.js.git");
    expect(result).toEqual({ owner: "vercel", name: "next.js" });
  });

  it("returns null for non-GitHub URLs", () => {
    expect(parseGitHubUrl("https://gitlab.com/org/repo")).toBeNull();
  });

  it("returns null for a URL with only owner segment", () => {
    expect(parseGitHubUrl("https://github.com/vercel")).toBeNull();
  });

  it("returns null for completely invalid input", () => {
    expect(parseGitHubUrl("not a url")).toBeNull();
  });

  it("handles URLs with trailing slashes correctly", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/tree/main");
    // Should still parse owner and name
    expect(result).toEqual({ owner: "owner", name: "repo" });
  });

  it("returns null for empty string", () => {
    expect(parseGitHubUrl("")).toBeNull();
  });
});

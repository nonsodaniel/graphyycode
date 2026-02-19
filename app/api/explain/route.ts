import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      type?: "file" | "snippet" | "repo";
      code?: string;
      snippet?: string;
      filePath?: string;
      repoFullName?: string;
      fileCount?: number;
      edgeCount?: number;
      language?: string;
      hubs?: string;
      entries?: string;
      roles?: string;
    };

    const {
      type = "file",
      code,
      snippet,
      filePath,
      repoFullName,
      fileCount,
      edgeCount,
      language,
      hubs,
      entries,
      roles,
    } = body;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI not configured — add OPENAI_API_KEY to environment variables" },
        { status: 503 }
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let userPrompt: string;

    if (type === "repo") {
      userPrompt = `Analyze the dependency graph of **${repoFullName}**:

Repository stats:
- ${fileCount} source files analyzed
- ${edgeCount} dependency relationships
- Primary language: ${language ?? "unknown"}
- Most imported files: ${hubs ?? "none"}
- Entry points: ${entries ?? "none"}

File roles detected:
${roles ?? "no role data"}

Provide a structured codebase analysis:

## Project Overview
What kind of project is this and what does it do?

## Architecture
How is the codebase structured? (MVC, layered, modular, etc.)

## Core Modules
The 3-5 most important files and their purpose.

## Data Flow
How does data move through the system?

## Quality Notes
Observations about code organization, patterns, and health.`;
    } else if (type === "snippet") {
      userPrompt = `Explain this code snippet from \`${filePath}\` (${repoFullName}):

\`\`\`
${snippet?.slice(0, 3000) ?? ""}
\`\`\`

Provide:

## What It Does
Clear explanation in 1-2 sentences.

## How It Works
Key logic explained step by step.

## Pattern
Design pattern or technique used.

## Notes
Any gotchas, edge cases, or important considerations.`;
    } else {
      userPrompt = `Analyze this file \`${filePath}\` from \`${repoFullName}\`:

\`\`\`
${code?.slice(0, 8000) ?? ""}
\`\`\`

Provide a structured analysis:

## Purpose
What this file does and its role in the codebase.

## Key Exports
The most important functions, classes, or components exported.

## Architecture
Design patterns and paradigms used.

## Dependencies
Why it imports what it does — what each dependency contributes.

## Concerns
Any TODOs, potential issues, or improvement opportunities.`;
    }

    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are an expert code analyst. Explain code clearly and concisely for developers. Use markdown with ## headers and **bold** for emphasis and `backticks` for code references. Be direct, insightful, and practical.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/explain]", err);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}

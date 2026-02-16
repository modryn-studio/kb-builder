import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Generate 2-letter initial from tool name */
function generateInitial(toolName: string): string {
  const words = toolName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return toolName.slice(0, 2).toUpperCase();
}

/** Generate consistent color from tool name */
function generateColor(toolName: string): string {
  const colors = [
    "hsl(38 58% 50%)",    // gold
    "hsl(217 91% 60%)",   // blue
    "hsl(152 35% 42%)",   // green
    "hsl(280 65% 60%)",   // purple
    "hsl(0 62% 50%)",     // red
    "hsl(24 70% 55%)",    // orange
    "hsl(190 70% 45%)",   // cyan
  ];
  let hash = 0;
  for (let i = 0; i < toolName.length; i++) {
    hash = (hash << 5) - hash + toolName.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "manuals/" });

    // Group by slug — find latest.json for each
    const slugs = new Map<string, { url: string; uploadedAt: string }>();

    for (const blob of blobs) {
      if (!blob.pathname.endsWith("/latest.json")) continue;

      // Extract slug from path: manuals/{slug}/latest.json
      const parts = blob.pathname.split("/");
      if (parts.length >= 3) {
        const slug = parts[1];
        slugs.set(slug, {
          url: blob.url,
          uploadedAt: blob.uploadedAt.toISOString(),
        });
      }
    }

    // Fetch each manual's metadata (lightweight — just tool name + summary)
    const manuals = await Promise.all(
      Array.from(slugs.entries()).map(async ([slug, { url, uploadedAt }]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          const data = await response.json();
          
          const toolName = data.tool || slug;
          const primaryUseCases = data.overview?.primaryUseCases ?? [];
          const tagline = primaryUseCases.slice(0, 2).join(" & ") || "Comprehensive instruction manual";
          const description = data.overview?.whatItIs || "Detailed guide with features, shortcuts, and workflows.";
          
          return {
            slug,
            tool: toolName,
            tagline,
            description,
            initial: generateInitial(toolName),
            color: generateColor(toolName),
            generatedAt: data.generatedAt || uploadedAt, // For sorting only
            featureCount: data.features?.length ?? 0,
            shortcutCount: data.shortcuts?.length ?? 0,
            workflowCount: data.workflows?.length ?? 0,
            tipCount: data.tips?.length ?? 0,
            url: `/manual/${slug}`,
          };
        } catch {
          return null;
        }
      })
    );

    const filtered = manuals
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    return NextResponse.json({ manuals: filtered });
  } catch (err) {
    console.error("List manuals error:", err);
    return NextResponse.json({ manuals: [] });
  }
}

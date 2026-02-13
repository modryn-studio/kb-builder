import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const runtime = "nodejs";

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
          return {
            slug,
            tool: data.tool || slug,
            generatedAt: data.generatedAt || uploadedAt,
            featureCount: data.features?.length ?? 0,
            shortcutCount: data.shortcuts?.length ?? 0,
            workflowCount: data.workflows?.length ?? 0,
            tipCount: data.tips?.length ?? 0,
            coverageScore: data.coverageScore ?? 0,
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

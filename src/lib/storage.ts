import { put, list } from "@vercel/blob";
import type { InstructionManual } from "./schema";
import { isValidSlug } from "./utils";

// ──────────────────────────────────────────────
// Store a manual (versioned + latest pointer)
// ──────────────────────────────────────────────

export async function storeManual(manual: InstructionManual): Promise<{
  blobUrl: string;
  shareableUrl: string;
  version: string;
}> {
  if (!isValidSlug(manual.slug)) {
    throw new Error(`Invalid slug: "${manual.slug}"`);
  }

  const version = new Date().toISOString().replace(/[:.]/g, "-");
  const serialized = JSON.stringify(manual, null, 2);

  // Store versioned copy
  const blob = await put(
    `manuals/${manual.slug}/${version}.json`,
    serialized,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      allowOverwrite: true,
    }
  );

  // Overwrite latest pointer
  await put(`manuals/${manual.slug}/latest.json`, serialized, {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareableUrl = `${baseUrl}/manual/${manual.slug}`;

  return { blobUrl: blob.url, shareableUrl, version };
}

// ──────────────────────────────────────────────
// Get latest manual by slug
// ──────────────────────────────────────────────

export async function getLatestManual(
  slug: string
): Promise<InstructionManual | null> {
  if (!isValidSlug(slug)) return null;

  try {
    const { blobs } = await list({
      prefix: `manuals/${slug}/latest.json`,
    });
    if (blobs.length === 0) return null;

    const response = await fetch(blobs[0].url, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;

    return (await response.json()) as InstructionManual;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Get version history for a slug
// ──────────────────────────────────────────────

export async function getManualVersions(
  slug: string
): Promise<Array<{ version: string; url: string; uploadedAt: string }>> {
  if (!isValidSlug(slug)) return [];

  try {
    const { blobs } = await list({ prefix: `manuals/${slug}/` });

    return blobs
      .filter((b) => !b.pathname.endsWith("latest.json"))
      .map((b) => {
        const filename = b.pathname.split("/").pop() ?? "";
        return {
          version: filename.replace(".json", ""),
          url: b.url,
          uploadedAt: b.uploadedAt.toISOString(),
        };
      })
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );
  } catch {
    return [];
  }
}

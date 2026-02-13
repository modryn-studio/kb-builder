import { NextResponse } from "next/server";
import { getManualVersions } from "@/lib/storage";
import { isValidSlug } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: "Invalid manual slug" },
      { status: 400 }
    );
  }

  const versions = await getManualVersions(slug);
  return NextResponse.json({ slug, versions });
}

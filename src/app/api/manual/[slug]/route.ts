import { NextResponse } from "next/server";
import { getLatestManual } from "@/lib/storage";
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

  const manual = await getLatestManual(slug);
  if (!manual) {
    return NextResponse.json(
      { error: "Manual not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(manual);
}

import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy: rewrite /manual/[slug]?format=json → /api/manual/[slug]
 * per Spec v4.1 requirement.
 */
export default function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (
    pathname.startsWith("/manual/") &&
    searchParams.get("format") === "json"
  ) {
    const slug = pathname.replace("/manual/", "");
    const apiUrl = new URL(`/api/manual/${slug}`, request.url);
    return NextResponse.rewrite(apiUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/manual/:slug*",
};

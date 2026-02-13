import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLatestManual } from "@/lib/storage";
import { isValidSlug } from "@/lib/utils";
import ManualContent from "./ManualContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return { title: "Invalid Manual" };
  }

  const manual = await getLatestManual(slug);
  if (!manual) {
    return { title: "Manual Not Found" };
  }

  return {
    title: `${manual.tool} — Instruction Manual`,
    description: manual.overview.whatItIs,
  };
}

export default async function ManualPage({ params }: PageProps) {
  const { slug } = await params;

  if (!isValidSlug(slug)) {
    notFound();
  }

  const manual = await getLatestManual(slug);
  if (!manual) {
    notFound();
  }

  return <ManualContent manual={manual} />;
}

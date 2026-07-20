import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import DocsContent from "@/components/docs/DocsContent";
import { ALL_DOC_PAGES } from "@/lib/docs-config";
import type { Metadata } from "next";

export function generateStaticParams() {
  return ALL_DOC_PAGES.filter((p) => p.slug !== "").map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = ALL_DOC_PAGES.find((p) => p.slug === slug);
  return { title: page?.title ?? slug };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const valid = ALL_DOC_PAGES.some((p) => p.slug === slug);
  if (!valid) notFound();

  const filePath = path.join(process.cwd(), `docs/wiki/${slug}.md`);
  if (!fs.existsSync(filePath)) notFound();

  const markdown = fs.readFileSync(filePath, "utf-8");
  return <DocsContent markdown={markdown} />;
}

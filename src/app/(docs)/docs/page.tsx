import fs from "fs";
import path from "path";
import DocsContent from "@/components/docs/DocsContent";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

export default function DocsIndexPage() {
  const filePath = path.join(process.cwd(), "docs/wiki/README.md");
  const markdown = fs.readFileSync(filePath, "utf-8");
  return <DocsContent markdown={markdown} />;
}

export interface DocPage {
  slug: string; // empty string = index
  title: string;
}

export interface DocSection {
  title: string;
  pages: DocPage[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    title: "Getting Started",
    pages: [
      { slug: "", title: "Overview" },
      { slug: "architecture", title: "Architecture" },
      { slug: "deployment", title: "Deployment Guide" },
    ],
  },
  {
    title: "Reference",
    pages: [
      { slug: "routes", title: "All Routes" },
      { slug: "database", title: "Database Schema" },
    ],
  },
  {
    title: "Systems",
    pages: [
      { slug: "bootstrap", title: "Bootstrap System" },
      { slug: "admin", title: "Admin System" },
    ],
  },
];

export const ALL_DOC_PAGES: DocPage[] = DOC_SECTIONS.flatMap((s) => s.pages);

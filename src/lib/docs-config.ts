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
  {
    title: "File Reference",
    pages: [
      { slug: "files-bootstrap-components", title: "Bootstrap Components" },
      { slug: "files-admin-components", title: "Admin Components" },
      { slug: "files-public-components", title: "Public Components" },
      { slug: "files-pages", title: "Pages" },
      { slug: "files-api", title: "API Routes" },
      { slug: "files-middleware", title: "Middleware & Config" },
    ],
  },
];

export const ALL_DOC_PAGES: DocPage[] = DOC_SECTIONS.flatMap((s) => s.pages);

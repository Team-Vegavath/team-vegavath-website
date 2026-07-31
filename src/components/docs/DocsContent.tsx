import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown passes heading children as a ReactNode (string, array, or
// elements). We only slugify the plain-text parts so [links](#anchor) can
// target the id we stamp on each heading; non-text children collapse to "".
function slugify(text: React.ReactNode): string {
  const str = Array.isArray(text)
    ? text.map((c) => (typeof c === "string" ? c : "")).join("")
    : typeof text === "string"
      ? text
      : "";
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .replace(/--+/g, "-")
    .trim();
}

// S68: every element that only carried a style object is now a plain tag styled
// by `.docs-prose *` in globals.css -- the move is what makes ::after, :hover
// and the mobile block reachable at all. Only two overrides survive, and both
// exist for logic rather than styling: the headings stamp an id, and `pre`
// needs a wrapper so a wide table or code block can scroll on its own. Inline
// vs. block code is now a CSS problem (`:not(pre) > code`), not a JS one.
export default function DocsContent({ markdown }: { markdown: string }) {
  return (
    <div className="docs-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 id={slugify(children)}>{children}</h1>,
          h2: ({ children }) => <h2 id={slugify(children)}>{children}</h2>,
          h3: ({ children }) => <h3 id={slugify(children)}>{children}</h3>,
          table: ({ children }) => (
            <div className="docs-table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

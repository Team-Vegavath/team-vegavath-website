import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const HEADING_FONT = "var(--font-chakra)";
const BODY_FONT = "var(--font-space)";
const MONO_FONT = "var(--font-mono)";

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

export default function DocsContent({ markdown }: { markdown: string }) {
  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              id={slugify(children)}
              style={{
                fontFamily: HEADING_FONT,
                fontSize: "clamp(1.6rem, 3vw, 2rem)",
                fontWeight: 700,
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
                marginBottom: "0.5rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              id={slugify(children)}
              style={{
                fontFamily: HEADING_FONT,
                fontSize: "1.2rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                letterSpacing: "0.04em",
                marginTop: "2.5rem",
                marginBottom: "0.75rem",
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={slugify(children)}
              style={{
                fontFamily: HEADING_FONT,
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "var(--accent)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: "1.75rem",
                marginBottom: "0.5rem",
              }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p
              style={{
                fontFamily: BODY_FONT,
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.75,
                marginBottom: "1rem",
              }}
            >
              {children}
            </p>
          ),
          // react-markdown v10 dropped the `inline` prop, so we detect block
          // code by its `language-*` className or a newline in its contents;
          // everything else renders as an inline span.
          code: ({
            className,
            children,
            ...props
          }: {
            className?: string;
            children?: React.ReactNode;
          }) => {
            const isBlock =
              /language-/.test(className ?? "") ||
              String(children ?? "").includes("\n");
            return isBlock ? (
              <code
                className={className}
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: "0.82rem",
                  display: "block",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  padding: "1.25rem",
                  overflowX: "auto",
                  marginBottom: "1rem",
                  border: "1px solid var(--border)",
                  lineHeight: 1.6,
                }}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={className}
                style={{
                  fontFamily: MONO_FONT,
                  fontSize: "0.82rem",
                  background: "var(--bg-elevated)",
                  color: "var(--accent)",
                  padding: "1px 6px",
                  border: "1px solid var(--border)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              style={{
                margin: "1rem 0",
                background: "none",
                padding: 0,
              }}
            >
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontFamily: BODY_FONT,
                  fontSize: "0.875rem",
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                fontFamily: MONO_FONT,
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                textAlign: "left",
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-strong)",
                background: "var(--bg-elevated)",
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                padding: "8px 12px",
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {children}
            </td>
          ),
          li: ({ children }) => (
            <li
              style={{
                fontFamily: BODY_FONT,
                fontSize: "0.95rem",
                color: "var(--text-secondary)",
                lineHeight: 1.75,
                marginBottom: "0.25rem",
              }}
            >
              {children}
            </li>
          ),
          ul: ({ children }) => (
            <ul
              style={{
                paddingLeft: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              style={{
                paddingLeft: "1.5rem",
                marginBottom: "1rem",
              }}
            >
              {children}
            </ol>
          ),
          strong: ({ children }) => (
            <strong
              style={{
                color: "var(--text-primary)",
                fontWeight: 600,
              }}
            >
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "3px solid var(--accent)",
                paddingLeft: "1rem",
                margin: "1rem 0",
                color: "var(--text-muted)",
                fontFamily: BODY_FONT,
                fontSize: "0.9rem",
              }}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              style={{
                color: "var(--accent)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

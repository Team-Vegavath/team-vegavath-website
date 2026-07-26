import type { ReactNode } from "react";

// Shared table chrome for every /f1 page: one scroll container, one header
// style, one set of borders. The public site had no data-table pattern before
// this section, so this is the single source of truth for it.

export function F1Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ marginBottom: "4rem", scrollMarginTop: "6rem" }}>
      <header style={{ marginBottom: "1.25rem" }}>
        <h2
          className="heading"
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className="mono"
            style={{
              marginTop: "0.4rem",
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function F1Table({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="f1-table-wrap">
      <table className="f1-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function F1Empty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="f1-empty">
        {message}
      </td>
    </tr>
  );
}

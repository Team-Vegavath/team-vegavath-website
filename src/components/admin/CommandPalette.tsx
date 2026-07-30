"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* S62/D5: the brief called for shadcn Command. Hand-rolled instead, same reason
   every other D-phase component was: cmdk + @radix-ui/react-dialog would be the
   first new runtime dependencies on this project since react-type-animation.

   The modal is a native <dialog> driven by showModal(). That is doing real work,
   not just standing in for a div: showModal() gives the focus trap, the Esc-to-
   close behaviour, the inert background and the top-layer paint (so it clears
   the admin sidebar's stacking context without a z-index) for free. A hand-built
   div modal would need all four re-implemented, which is where the bugs live.

   Deliberately NOT here: arrow-key selection. Every row is a real <button>
   inside a focus-trapped dialog, so Tab already walks the list, and Enter in the
   input jumps to the first match. Add arrow keys if the list ever outgrows one
   screen. */

export type CommandPage = { readonly href: string; readonly label: string };

type Props = {
  // Passed in rather than declared here: AdminShell's NAV_ITEMS is already the
  // canonical list of admin pages. Importing it back from AdminShell would be a
  // circular import, and re-declaring it would be a second list to forget.
  pages: readonly CommandPage[];
};

export function CommandPalette({ pages }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Bound to window, not the dialog: the palette has to open from anywhere in
  // the panel, including while an admin form input holds focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // showModal() on an already-open dialog throws InvalidStateError, and close()
  // on a closed one fires a spurious close event -- hence both .open guards.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const q = query.trim().toLowerCase();
  const matches = q ? pages.filter((p) => p.label.toLowerCase().includes(q)) : pages;

  return (
    <dialog
      ref={dialogRef}
      className="command-palette"
      aria-label="Search admin pages"
      /* The close event is the single sync point back to React: it fires for
         Esc, for the backdrop path and for our own close() call, so the query
         reset lives here instead of in an effect. */
      onClose={() => {
        setOpen(false);
        setQuery("");
      }}
      /* Clicks on ::backdrop target the <dialog> itself. Padding is 0 and the
         panel below fills it, so this can only be a backdrop hit. */
      onClick={(e) => {
        if (e.target === dialogRef.current) setOpen(false);
      }}
      style={{
        /* No `display` here: a closed <dialog> is display:none, and an inline
           display would override that and pin the palette open forever. */
        padding: 0,
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        width: "min(34rem, calc(100% - 2rem))",
        maxWidth: "none",
        marginTop: "12vh",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Destructured rather than indexed: noUncheckedIndexedAccess makes
          // matches[0] possibly-undefined even after a length check.
          const [first] = matches;
          if (first) go(first.href);
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH PAGES"
          aria-label="Filter admin pages"
          /* showModal() autofocuses the first focusable element, which is this
             input -- no autoFocus attribute and no focus() call needed. */
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid var(--border)",
            borderRadius: 0,
            outline: "none",
            padding: "1rem 1.25rem",
            fontFamily: "var(--font-mono)",
            fontSize: "0.78rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
          }}
        />
      </form>

      <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
        {matches.length === 0 ? (
          <p
            className="mono"
            style={{ padding: "1.25rem", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}
          >
            No matching page
          </p>
        ) : (
          matches.map(({ href, label }) => (
            <button
              key={href}
              type="button"
              className="command-palette-item"
              onClick={() => go(href)}
            >
              <span>{label}</span>
              <span className="mono" style={{ fontSize: "0.62rem", letterSpacing: "0.1em", color: "var(--text-muted)" }}>
                {href}
              </span>
            </button>
          ))
        )}
      </div>
    </dialog>
  );
}

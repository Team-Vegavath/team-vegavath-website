"use client";

import { useEffect, useRef, useState } from "react";

/**
 * S49: table-row copy action. Same shape as the local CopyLinkButton in
 * AccountsActions.tsx, but exported so the gallery table can hand out R2 URLs
 * without the admin selecting a truncated cell by hand.
 */
export default function CopyButton({
  text,
  label = "COPY URL",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // clearing on unmount keeps the timer from firing setState on a dead row
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (non-https / permission) - the URL is in the title attr
    }
  }

  return (
    <button type="button" className="admin-row-action" title={text} onClick={copy}>
      {copied ? "COPIED" : label}
    </button>
  );
}

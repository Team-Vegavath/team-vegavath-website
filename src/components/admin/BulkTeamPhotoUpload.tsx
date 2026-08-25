"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { uploadToR2 } from "@/lib/utils";

interface TeamMember { id: string; name: string; photo_url: string | null; }
interface Match {
  file: File;
  preview: string;  // object URL for preview
  member: TeamMember | null;
  override: string | null;  // member id if admin manually reassigns
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchMember(filename: string, members: TeamMember[]): TeamMember | null {
  const cleaned = filename.replace(/\.[^.]+$/, "");  // remove extension
  const slug = slugify(cleaned);

  // Exact full-name slug match
  for (const m of members) {
    if (slugify(m.name) === slug) return m;
  }
  // All significant parts of member name appear in filename
  for (const m of members) {
    const parts = m.name.toLowerCase().split(/\s+/).filter(p => p.length > 2);
    if (parts.length > 0 && parts.every(p => slug.includes(p))) return m;
  }
  // Any single part match (first name only)
  for (const m of members) {
    const first = m.name.toLowerCase().split(" ")[0] ?? "";
    if (first.length > 3 && slug.includes(first)) return m;
  }
  return null;
}

export default function BulkTeamPhotoUpload({ members }: { members: TeamMember[] }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFiles(files: FileList) {
    const result: Match[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      member: matchMember(file.name, members),
      override: null,
    }));
    setMatches(result);
    setDone(false);
    setErrors([]);
  }

  async function handleUpload() {
    setUploading(true);
    const errs: string[] = [];

    await Promise.all(
      matches.map(async (m) => {
        const memberId = m.override ?? m.member?.id;
        if (!memberId) return;  // unmatched, user left unassigned
        try {
          // timestamped key: R2 serves immutable cache headers, never reuse a key
          const url = await uploadToR2(
            m.file,
            `team/${memberId}-${Date.now()}.${m.file.name.split(".").pop()}`
          );
          const save = await fetch("/api/admin/team", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: memberId, photo_url: url }),
          });
          if (!save.ok) throw new Error("Save failed");
        } catch (e) {
          errs.push(`${m.file.name}: ${e instanceof Error ? e.message : "failed"}`);
        }
      })
    );

    setUploading(false);
    setErrors(errs);
    if (errs.length === 0) {
      setDone(true);
      matches.forEach(m => URL.revokeObjectURL(m.preview));
      setMatches([]);
      router.refresh();
    }
  }

  function handleCancel() {
    matches.forEach(m => URL.revokeObjectURL(m.preview));
    setMatches([]);
    setErrors([]);
  }

  const matchedCount = matches.filter(m => m.override ?? m.member).length;

  return (
    <div style={{ marginBottom: "2rem" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />

      {matches.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            fontFamily: "var(--font-mono)", fontSize: "0.72rem",
            letterSpacing: "0.1em", textTransform: "uppercase",
            border: "1px solid var(--border)", background: "none",
            color: "var(--text-muted)", padding: "8px 18px", cursor: "pointer",
          }}
        >
          BULK PHOTO UPLOAD
        </button>
      ) : (
        <div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: "0.72rem",
            letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.75rem",
          }}>
            {matchedCount}/{matches.length} MATCHED
            {matchedCount < matches.length &&
              ` ∙ ${matches.length - matchedCount} need manual assignment`}
          </div>

          {/* Preview table */}
          <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["PHOTO", "FILENAME", "MATCHED TO", "ASSIGN"].map(h => (
                    <th key={h} style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.65rem",
                      letterSpacing: "0.12em", color: "var(--text-muted)",
                      textAlign: "left", padding: "6px 12px",
                      borderBottom: "1px solid var(--border)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i}>
                    <td style={{ padding: "8px 12px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.preview} alt=""
                        style={{ width: 40, height: 40, objectFit: "cover",
                          border: "1px solid var(--border)" }} />
                    </td>
                    <td style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                      color: "var(--text-secondary)", padding: "8px 12px",
                    }}>
                      {m.file.name}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {(m.override ?? m.member?.id) ? (
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                          color: "var(--success)",
                        }}>
                          {members.find(x => x.id === (m.override ?? m.member?.id))?.name ?? "∙"}
                        </span>
                      ) : (
                        <span style={{
                          fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                          color: "var(--error)",
                        }}>no match</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <select
                        value={m.override ?? m.member?.id ?? ""}
                        onChange={e => setMatches(prev => prev.map((x, j) =>
                          j === i ? { ...x, override: e.target.value || null } : x
                        ))}
                        style={{
                          background: "var(--bg-base)", color: "var(--text-secondary)",
                          border: "1px solid var(--border)", padding: "4px 8px",
                          fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                        }}
                      >
                        <option value="">-- skip --</option>
                        {members.map(mem => (
                          <option key={mem.id} value={mem.id}>{mem.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleUpload}
              disabled={uploading || matchedCount === 0}
              style={{
                fontFamily: "var(--font-chakra)", fontSize: "0.75rem",
                letterSpacing: "0.08em", textTransform: "uppercase",
                background: uploading ? "var(--bg-elevated)" : "var(--accent)",
                color: uploading ? "var(--text-muted)" : "var(--bg-base)",
                border: "none", padding: "8px 18px", cursor: uploading ? "wait" : "pointer",
              }}
            >
              {uploading ? "UPLOADING..." : `UPLOAD ${matchedCount} PHOTOS`}
            </button>
            <button
              onClick={handleCancel}
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer" }}
            >
              CANCEL
            </button>
          </div>

          {errors.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              {errors.map((e, i) => (
                <p key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem",
                  color: "var(--error)" }}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {done && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem",
          color: "var(--success)", marginTop: "0.5rem" }}>
          ALL PHOTOS UPLOADED
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

/* These six values are what /api/join and the DB CHECK constraint accept
   (Coding requires migrations/002_add_coding_domain.sql applied to Neon);
   do not add domains here without a matching backend change. */
const DOMAINS = ["Automotive", "Robotics", "Design", "Media", "Marketing", "Coding"] as const;
type Domain = typeof DOMAINS[number];

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";
const INSTAGRAM_URL = "https://www.instagram.com/teamvegavath_pesu/";

type FormData = {
  name: string;
  email: string;
  domain_interest: Domain | "";
  portfolio_url: string;
  website: string; // honeypot
};

type Props = {
  recruitmentOpen: boolean;
};

export default function JoinClient({ recruitmentOpen }: Props) {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    domain_interest: "",
    portfolio_url: "",
    website: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain_interest) {
      setErrorMsg("Pick a domain to apply for.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (!recruitmentOpen) {
    return (
      <main
        className="pattern-speed-lines"
        style={{ minHeight: "100vh", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "7rem 1.5rem 4rem", boxSizing: "border-box" }}
      >
        <div style={{ width: "100%", maxWidth: "36rem" }}>
          <Image
            src={LOGO_URL}
            alt="Team Vegavath shield"
            width={56}
            height={56}
            style={{ height: "56px", width: "56px", objectFit: "contain", marginBottom: "1.75rem" }}
          />
          <h1 className="heading" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 600, textTransform: "uppercase" }}>
            Recruitment is currently closed.
          </h1>
          <p style={{ marginTop: "1.25rem", color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7 }}>
            Follow us on Instagram to be notified when we open:{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>
              @teamvegavath_pesu
            </a>
          </p>
          <Link
            href="/"
            className="heading"
            style={{ display: "inline-flex", marginTop: "2.5rem", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-secondary)", textDecoration: "none" }}
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main
        className="pattern-speed-lines"
        style={{ minHeight: "100vh", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "7rem 1.5rem 4rem", boxSizing: "border-box" }}
      >
        <div style={{ width: "100%", maxWidth: "36rem" }}>
          <p className="mono" style={{ fontSize: "0.8rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--success)" }}>
            Application received
          </p>
          <h1 className="heading" style={{ marginTop: "1rem", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 700, textTransform: "uppercase" }}>
            {"You're on the grid."}
          </h1>
          <p style={{ marginTop: "1.25rem", color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7 }}>
            {"Thanks for applying to Team Vegavath. We review every application and we'll reach out over email."}
          </p>
          <Link href="/" className="btn-outline" style={{ marginTop: "2.5rem" }}>
            BACK TO HOME
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="join-split" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Branding panel: orange, stacked type (no logo; the navbar already has it) */}
      <div className="join-brand pattern-speed-lines-strong">
        <h1 className="heading" style={{ fontWeight: 700, fontSize: "clamp(2.75rem, 7vw, 4.5rem)", lineHeight: 0.95, textTransform: "uppercase", color: "var(--bg-base)" }}>
          Join
          <br />
          The
          <br />
          Team
        </h1>
        <div style={{ marginTop: "auto" }}>
          <p className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(10,10,10,0.7)", marginBottom: "0.6rem" }}>
            Six domains
          </p>
          <p className="heading" style={{ fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--bg-base)" }}>
            Coding · Automotives · Sponsorship &amp; Finance
            <br />
            Robotics · Operations · Social Media
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="join-form-panel" style={{ padding: "4rem clamp(1.5rem, 5vw, 5rem) 5rem" }}>
        <div style={{ maxWidth: "34rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "3rem" }}>
            Applications are reviewed by the domain leads. Tell us who you are and where you want to build.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
            {/* Honeypot: hidden from humans */}
            <input type="text" name="website" value={form.website} onChange={handleChange} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

            <div>
              <label htmlFor="join-name" className="label-tech" style={{ display: "block", marginBottom: "0.35rem" }}>
                Full name *
              </label>
              <input
                id="join-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your full name"
                className="join-input"
              />
            </div>

            <div>
              <label htmlFor="join-email" className="label-tech" style={{ display: "block", marginBottom: "0.35rem" }}>
                Email address *
              </label>
              <input
                id="join-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="join-input"
              />
            </div>

            <div>
              <p className="label-tech" style={{ marginBottom: "0.75rem" }}>Domain of interest *</p>
              <div className="join-domain-tiles" role="group" aria-label="Domain of interest">
                {DOMAINS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="join-domain-tile"
                    aria-pressed={form.domain_interest === d}
                    onClick={() => setForm((prev) => ({ ...prev, domain_interest: d }))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="join-portfolio" className="label-tech" style={{ display: "block", marginBottom: "0.35rem" }}>
                Portfolio / GitHub URL (optional)
              </label>
              <input
                id="join-portfolio"
                type="url"
                name="portfolio_url"
                value={form.portfolio_url}
                onChange={handleChange}
                placeholder="https://github.com/yourusername"
                className="join-input"
              />
            </div>

            {status === "error" && (
              <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="btn-primary"
              style={{ width: "100%", padding: "1rem", opacity: status === "submitting" ? 0.6 : 1, cursor: status === "submitting" ? "not-allowed" : "pointer" }}
            >
              {status === "submitting" ? "SUBMITTING..." : "SUBMIT APPLICATION"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

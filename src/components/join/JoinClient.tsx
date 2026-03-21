"use client";

import { useState } from "react";
import Link from "next/link";

const DOMAINS = ["Automotive", "Robotics", "Design", "Media", "Marketing"] as const;
type Domain = typeof DOMAINS[number];

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <main style={{ minHeight: "100vh", background: "#121212", color: "#EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 1.5rem", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: "36rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🚫</div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#EBEBEB", textAlign: "center", marginBottom: "1rem" }}>Recruitment Closed</h1>
          <p style={{ color: "#9a9a9a", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem", textAlign: "center" }}>
            We are not accepting applications right now. Follow our social media for announcements on when recruitment opens.
          </p>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1.5px solid #EF5D08", background: "transparent", color: "#EF5D08", padding: "0.75rem 2rem", fontWeight: 700, textDecoration: "none" }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (status === "success") {
    return (
      <main style={{ minHeight: "100vh", background: "#121212", color: "#EBEBEB", display: "flex", alignItems: "center", justifyContent: "center", padding: "6rem 1.5rem", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: "36rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🏁</div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#EBEBEB", textAlign: "center", marginBottom: "1rem" }}>Application Submitted!</h1>
          <p style={{ color: "#9a9a9a", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem", textAlign: "center" }}>
            Thanks for applying to Team Vegavath. We'll review your application and get back to you soon.
          </p>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", background: "#EF5D08", color: "white", padding: "0.75rem 2rem", fontWeight: 700, textDecoration: "none" }}>
            Back to Home 🏎️
          </Link>
        </div>
      </main>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "0.5rem",
    padding: "0.875rem 1rem",
    color: "#EBEBEB",
    fontSize: "1rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#9a9a9a",
    marginBottom: "0.5rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#121212", color: "#EBEBEB", padding: "6rem 1.5rem 4rem", boxSizing: "border-box" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "40rem" }}>

        <header style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 900, color: "#EBEBEB", textAlign: "center", letterSpacing: "0.05em" }}>
            Join The Race
          </h1>
          <p style={{ marginTop: "0.75rem", color: "#9a9a9a", fontSize: "1rem", textAlign: "center" }}>
            Ready to accelerate? Apply to Team Vegavath below.
          </p>
        </header>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "1rem", padding: "2rem 1.5rem", boxSizing: "border-box" }}>

          {/* Honeypot — hidden from humans */}
          <input type="text" name="website" value={form.website} onChange={handleChange} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

          <div>
            <label style={labelStyle}>Full Name *</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Your full name"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#EF5D08")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div>
            <label style={labelStyle}>Email Address *</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#EF5D08")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          <div>
            <label style={labelStyle}>Domain of Interest *</label>
            <select
              name="domain_interest"
              value={form.domain_interest}
              onChange={handleChange}
              required
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={e => (e.target.style.borderColor = "#EF5D08")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            >
              <option value="" disabled>Select your domain</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d} style={{ background: "#1a1a1a" }}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Portfolio / GitHub URL <span style={{ color: "#666", fontWeight: 400 }}>(optional)</span></label>
            <input
              type="url"
              name="portfolio_url"
              value={form.portfolio_url}
              onChange={handleChange}
              placeholder="https://github.com/yourusername"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#EF5D08")}
              onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {status === "error" && (
            <p style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center" }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            style={{ width: "100%", borderRadius: "9999px", background: status === "submitting" ? "#666" : "#EF5D08", color: "white", padding: "1rem", fontSize: "1rem", fontWeight: 700, border: "none", cursor: status === "submitting" ? "not-allowed" : "pointer", transition: "background 0.2s", marginTop: "0.5rem" }}
          >
            {status === "submitting" ? "Submitting..." : "Submit Application 🏁"}
          </button>

        </form>
      </div>
    </main>
  );
}

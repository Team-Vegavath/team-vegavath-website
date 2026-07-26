"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  slug: string;
  eventTitle: string;
}

// Same treatment as JoinClient: mono uppercase labels, .join-input underline
// fields. Reused rather than restyled so the two public forms stay identical.
const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: "0.72rem",
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-primary)",
  marginBottom: "0.5rem",
};

function Req() {
  return <span style={{ color: "var(--accent)" }}> *</span>;
}

export default function EventRegisterForm({ slug, eventTitle }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    srn: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch(`/api/events/${slug}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);

    const data = await res?.json().catch(() => null);

    if (!res?.ok) {
      setErrorMsg(
        typeof data?.error === "string" ? data.error : "Registration failed. Please retry."
      );
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  if (status === "success") {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          padding: "2.5rem clamp(1.5rem, 4vw, 3rem)",
        }}
      >
        <p
          className="mono"
          style={{
            fontSize: "0.78rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--success)",
          }}
        >
          Registration received
        </p>
        <h2
          className="heading"
          style={{
            marginTop: "1rem",
            fontSize: "clamp(1.4rem, 3.5vw, 2rem)",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          You are on the list
        </h2>
        <p
          style={{
            marginTop: "1rem",
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.7,
          }}
        >
          {`We have your registration for ${eventTitle}. The team reviews entries and will reach out over email.`}
        </p>
        <Link href={`/events/${slug}`} className="btn-outline" style={{ marginTop: "2rem" }}>
          BACK TO EVENT
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        padding: "2.5rem clamp(1.5rem, 4vw, 3rem)",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
      }}
    >
      <div>
        <label htmlFor="reg-name" style={labelStyle}>
          Full name<Req />
        </label>
        <input
          id="reg-name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={100}
          placeholder="Your full name"
          className="join-input"
        />
      </div>

      <div>
        <label htmlFor="reg-email" style={labelStyle}>
          Email address<Req />
        </label>
        <input
          id="reg-email"
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
        <label htmlFor="reg-phone" style={labelStyle}>
          Phone number<Req />
        </label>
        <input
          id="reg-phone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          pattern="[+0-9\s-]{10,16}"
          title="10-digit number (a +91 prefix is fine)"
          placeholder="10-digit number"
          className="join-input"
        />
      </div>

      <div>
        <label htmlFor="reg-srn" style={labelStyle}>
          SRN / PRN
        </label>
        <input
          id="reg-srn"
          type="text"
          name="srn"
          value={form.srn}
          onChange={handleChange}
          maxLength={40}
          placeholder="Optional"
          className="join-input"
        />
      </div>

      <div>
        <label htmlFor="reg-message" style={labelStyle}>
          Why you want to attend
        </label>
        <textarea
          id="reg-message"
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={4}
          maxLength={1000}
          placeholder="Optional"
          className="join-input"
          style={{
            resize: "vertical",
            minHeight: "110px",
            fontFamily: "var(--font-space), sans-serif",
            lineHeight: 1.6,
          }}
        />
      </div>

      {errorMsg ? (
        <p
          className="mono"
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            color: "var(--accent)",
          }}
        >
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary"
        style={{
          width: "100%",
          padding: "1rem",
          opacity: status === "submitting" ? 0.6 : 1,
          cursor: status === "submitting" ? "not-allowed" : "pointer",
        }}
      >
        {status === "submitting" ? "SUBMITTING..." : "SUBMIT REGISTRATION"}
      </button>
    </form>
  );
}

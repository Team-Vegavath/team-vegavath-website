"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ConsentNotice } from "@/components/ui/ConsentNotice";
import { HyperText } from "@/components/ui/hyper-text";

/* FY26 recruitment domains. These six values are what /api/join and the DB
   CHECK constraints accept (requires migrations/004_application_new_fields.sql
   applied to Neon); do not change them without a matching backend change. */
const DOMAINS = [
  "Coding",
  "Automotives",
  "Sponsorship",
  "Robotics",
  "Operations",
  "Social Media",
] as const;
type Domain = typeof DOMAINS[number];

const SEMESTERS = [
  { value: "1", label: "1st" },
  { value: "3", label: "3rd" },
  { value: "5", label: "5th" },
] as const;

const LOGO_URL = "https://pub-f86fbbd7cd4a45088698b74e2b9a3e5f.r2.dev/icons/logo.png";
const INSTAGRAM_URL = "https://www.instagram.com/teamvegavath_pesu/";

type Step = 1 | 2 | 3 | 4;

const STEP_TITLES: Record<Step, string> = {
  1: "WHO ARE YOU",
  2: "WHERE YOU WANT TO BUILD",
  3: "WHY VEGAVATH",
  4: "YOUR EXPERIENCE",
};

type FormData = {
  name: string;
  email: string;
  mobile_number: string;
  srn_prn: string;
  semester: "" | "1" | "3" | "5";
  why_join: string;
  value_addition: string;
  domain_experience: string;
  design_portfolio_url: string;
  website: string; // honeypot
};

const MAX_DOMAINS = 3;

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

const hintStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.65rem",
  letterSpacing: "0.1em",
  color: "var(--text-muted)",
  marginTop: "0.5rem",
};

const textareaStyle: React.CSSProperties = {
  resize: "vertical",
  minHeight: "120px",
  fontFamily: "var(--font-space), sans-serif",
  lineHeight: 1.6,
};

function Req() {
  return <span style={{ color: "var(--accent)" }}> *</span>;
}

type Props = {
  recruitmentOpen: boolean;
};

export default function JoinClient({ recruitmentOpen }: Props) {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    mobile_number: "",
    srn_prn: "",
    semester: "",
    why_join: "",
    value_addition: "",
    domain_experience: "",
    design_portfolio_url: "",
    website: "",
  });
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Casual-spam deterrent only (clearing cookies bypasses it) -- the server
  // stays the source of truth via the honeypot + validation in /api/join.
  useEffect(() => {
    const cookies = document.cookie.split(";").map((c) => c.trim());
    if (cookies.some((c) => c.startsWith("vg_applied="))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time cookie check, browser-only
      setAlreadyApplied(true);
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleDomain = (d: Domain) => {
    setSelectedDomains((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= MAX_DOMAINS) return prev; // limit reached -- ignore, no error
      return [...prev, d];
    });
  };

  const clearError = () => {
    setErrorMsg("");
    if (status === "error") setStatus("idle");
  };

  const goBack = () => {
    clearError();
    setStep((s) => Math.max(1, s - 1) as Step);
  };

  /* Native validation (required / type / pattern) covers the text fields;
     only the tile selectors need JS checks here. */
  const validateStep = (s: Step): string | null => {
    if (s === 1 && !form.semester) return "Select your current semester.";
    if (s === 2 && selectedDomains.length === 0) return "Pick at least one domain.";
    return null;
  };

  const submitApplication = async () => {
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          mobile_number: form.mobile_number,
          srn_prn: form.srn_prn,
          semester: form.semester,
          domain_interest: selectedDomains[0],
          domain_interest_2: selectedDomains[1] ?? null,
          domain_interest_3: selectedDomains[2] ?? null,
          why_join: form.why_join,
          value_addition: form.value_addition,
          domain_experience: form.domain_experience,
          design_portfolio_url: selectedDomains.includes("Social Media")
            ? form.design_portfolio_url
            : null,
          website: form.website, // honeypot
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong");
        setStatus("error");
      } else {
        document.cookie =
          "vg_applied=1; max-age=" + (60 * 60 * 24 * 30) + "; path=/; SameSite=Lax";
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  /* One form drives all steps: Enter / NEXT triggers native validation on
     the currently rendered fields, then either advances or submits. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stepError = validateStep(step);
    if (stepError) {
      setErrorMsg(stepError);
      setStatus("error");
      return;
    }
    clearError();
    if (step < 4) {
      setStep((s) => (s + 1) as Step);
    } else {
      void submitApplication();
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

  const socialMediaSelected = selectedDomains.includes("Social Media");

  return (
    <main className="join-split" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Branding panel: dark surface, orange edge + type (no logo; the navbar already has it) */}
      <div className="join-brand pattern-speed-lines">
        {/* S59: HyperText scrambles each word in, staggered 0 / 120 / 240ms, and
            re-scrambles that word on hover. The <h1> keeps its own class and
            inline style so the spans inherit Orbitron, the clamp() size and
            var(--accent) -- same containment pattern as NumberTicker inside
            .stat-number. One HyperText per word rather than one for the whole
            string because the three hard <br /> line breaks have to survive, and
            HyperText takes a plain string. Words are passed already uppercased
            so the A-Z scramble charset matches the resolved letters; the h1's
            textTransform would mask a case mismatch visually but the accessible
            text comes from the string itself. */}
        <h1 className="heading" style={{ fontWeight: 700, fontSize: "clamp(2.75rem, 7vw, 4.5rem)", lineHeight: 0.95, textTransform: "uppercase", color: "var(--accent)" }}>
          <HyperText>JOIN</HyperText>
          <br />
          <HyperText delay={120}>THE</HyperText>
          <br />
          <HyperText delay={240}>TEAM</HyperText>
        </h1>
        <div style={{ marginTop: "auto" }}>
          <p className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
            Six domains
          </p>
          <p className="heading" style={{ fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)" }}>
            Coding · Automotives · Sponsorship
            <br />
            Robotics · Operations · Social Media
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="join-form-panel" style={{ padding: "4rem clamp(1.5rem, 5vw, 5rem) 5rem" }}>
        {alreadyApplied ? (
          <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
            <p style={{
              fontFamily: "var(--font-mono)", fontSize: "0.75rem",
              letterSpacing: "0.15em", color: "var(--text-secondary)",
              textTransform: "uppercase",
            }}>
              YOU&apos;VE ALREADY APPLIED THIS CYCLE.
            </p>
            <p style={{
              fontFamily: "var(--font-space)", color: "var(--text-muted)",
              fontSize: "0.9rem", marginTop: "0.75rem", lineHeight: 1.6,
            }}>
              We review every application. You&apos;ll hear from us over email.
            </p>
          </div>
        ) : (
        <div style={{ maxWidth: "34rem" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "2.5rem" }}>
            Applications are reviewed by the domain leads. Tell us who you are,
            where you want to build, and what you bring to the grid.
          </p>

          {/* Step indicator.
              S60/D3: the four 18x4px bars this replaced showed position but not
              progress -- a completed step and an unreached one differed only by
              a near-identical border grey. Numbered boxes with filled connectors
              read as a real stepped progress bar. Squares, not circles: the
              radius ban applies, and they line up with the sharp inputs below.
              The "Step X of 4" line is kept as the accessible text and the
              stepper itself is aria-hidden, so nothing is announced twice.
              Built inline rather than extracted -- one caller, no second use. */}
          <div style={{ marginBottom: "2.5rem" }}>
            <p className="mono" style={{ fontSize: "0.7rem", letterSpacing: "0.18em", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Step {step} of 4
            </p>
            <div aria-hidden="true" style={{ display: "flex", alignItems: "center", marginTop: "0.9rem" }}>
              {([1, 2, 3, 4] as const).map((s, i) => (
                <Fragment key={s}>
                  <div
                    className="mono"
                    style={{
                      width: "32px",
                      height: "32px",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `2px solid ${step >= s ? "var(--accent)" : "var(--border-strong)"}`,
                      background: step > s ? "var(--accent)" : step === s ? "var(--accent-dim)" : "transparent",
                      fontSize: "0.75rem",
                      color: step > s ? "var(--bg-base)" : step === s ? "var(--accent)" : "var(--text-muted)",
                      transition: "border-color 0.2s ease, background 0.2s ease, color 0.2s ease",
                    }}
                  >
                    {step > s ? "✓" : s}
                  </div>
                  {i < 3 ? (
                    <div
                      style={{
                        flex: 1,
                        height: "2px",
                        background: step > s ? "var(--accent)" : "var(--border-strong)",
                        transition: "background 0.2s ease",
                      }}
                    />
                  ) : null}
                </Fragment>
              ))}
            </div>
            <h2 className="heading" style={{ marginTop: "1rem", fontSize: "clamp(1.35rem, 3vw, 1.75rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {STEP_TITLES[step]}
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
            {/* Honeypot: hidden from humans, rendered on every step */}
            <input type="text" name="website" value={form.website} onChange={handleChange} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

            {step === 1 && (
              <>
                <div>
                  <label htmlFor="join-name" style={labelStyle}>
                    Full name<Req />
                  </label>
                  <input
                    id="join-name"
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
                  <label htmlFor="join-email" style={labelStyle}>
                    Email address<Req />
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
                  <label htmlFor="join-mobile" style={labelStyle}>
                    Mobile number<Req />
                  </label>
                  <input
                    id="join-mobile"
                    type="tel"
                    name="mobile_number"
                    value={form.mobile_number}
                    onChange={handleChange}
                    required
                    pattern="[+0-9\s-]{10,16}"
                    title="10-digit number (a +91 prefix is fine)"
                    placeholder="10-digit number"
                    className="join-input"
                  />
                  <p
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      fontSize: "0.68rem",
                      letterSpacing: "0.04em",
                      color: "var(--text-muted)",
                      marginTop: "0.4rem",
                    }}
                  >
                    +91 prefix is fine -- it will be removed
                  </p>
                </div>

                <div>
                  <label htmlFor="join-srn" style={labelStyle}>
                    SRN / PRN<Req />
                  </label>
                  <input
                    id="join-srn"
                    type="text"
                    name="srn_prn"
                    value={form.srn_prn}
                    // S54: SRNs are uppercase by convention, so normalise into
                    // state rather than styling with textTransform -- the state
                    // is what gets submitted, and textTransform would also
                    // uppercase the placeholder.
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        srn_prn: e.target.value.toUpperCase(),
                      }))
                    }
                    required
                    placeholder="Your SRN or PRN"
                    className="join-input"
                  />
                </div>

                <div>
                  <p style={labelStyle}>
                    Semester<Req />
                  </p>
                  <div
                    role="group"
                    aria-label="Semester"
                    style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}
                  >
                    {SEMESTERS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className="join-domain-tile"
                        aria-pressed={form.semester === s.value}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, semester: s.value }));
                          clearError();
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div>
                <p style={labelStyle}>
                  Domains of interest<Req />
                </p>
                <div className="join-domain-tiles" role="group" aria-label="Domains of interest">
                  {DOMAINS.map((d) => {
                    const isSelected = selectedDomains.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        className="join-domain-tile"
                        aria-pressed={isSelected}
                        onClick={() => {
                          toggleDomain(d);
                          clearError();
                        }}
                        style={{
                          opacity: !isSelected && selectedDomains.length >= MAX_DOMAINS ? 0.5 : 1,
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <p className="mono" style={{ marginTop: "0.6rem", fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                  {selectedDomains.length} / {MAX_DOMAINS} DOMAINS SELECTED
                </p>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label htmlFor="join-why" style={labelStyle}>
                    Why do you want to join Vegavath?<Req />
                  </label>
                  <textarea
                    id="join-why"
                    name="why_join"
                    value={form.why_join}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="join-input"
                    style={textareaStyle}
                  />
                  <p style={hintStyle}>Be specific.</p>
                </div>

                <div>
                  <label htmlFor="join-value" style={labelStyle}>
                    What makes you a valuable addition to the team?<Req />
                  </label>
                  <textarea
                    id="join-value"
                    name="value_addition"
                    value={form.value_addition}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="join-input"
                    style={textareaStyle}
                  />
                  <p style={hintStyle}>Skills, mindset, what you bring.</p>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <label htmlFor="join-experience" style={labelStyle}>
                    {"Describe your experience in the domains you've chosen."}<Req />
                  </label>
                  <textarea
                    id="join-experience"
                    name="domain_experience"
                    value={form.domain_experience}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="join-input"
                    style={textareaStyle}
                  />
                  <p style={hintStyle}>{"Enter 'None' if you have no prior experience."}</p>
                </div>

                {socialMediaSelected && (
                  <div>
                    <label htmlFor="join-design-portfolio" style={labelStyle}>
                      Portfolio link (required for Social Media)<Req />
                    </label>
                    <input
                      id="join-design-portfolio"
                      type="text"
                      name="design_portfolio_url"
                      value={form.design_portfolio_url}
                      onChange={handleChange}
                      required
                      placeholder="Google Drive link (set access to: anyone with link)"
                      className="join-input"
                    />
                  </div>
                )}
              </>
            )}

            {status === "error" && (
              <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{errorMsg}</p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-primary"
                style={{ width: "100%", padding: "1rem", opacity: status === "submitting" ? 0.6 : 1, cursor: status === "submitting" ? "not-allowed" : "pointer" }}
              >
                {step < 4
                  ? "NEXT →"
                  : status === "submitting"
                    ? "SUBMITTING..."
                    : "SUBMIT APPLICATION"}
              </button>
              {/* Step 4 only - steps 1-3 advance the form, they do not submit. */}
              {step === 4 && <ConsentNotice />}
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="mono"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    alignSelf: "flex-start",
                    fontSize: "0.75rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
              )}
            </div>
          </form>
        </div>
        )}
      </div>
    </main>
  );
}

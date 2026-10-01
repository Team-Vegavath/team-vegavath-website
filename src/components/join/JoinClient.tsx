"use client";

import { Fragment, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ConsentNotice } from "@/components/ui/ConsentNotice";
import { HyperText } from "@/components/ui/hyper-text";
import {
  COURSES,
  DOMAINS,
  DOMAIN_LABELS,
  GENERAL_QUESTIONS,
  LINK_MAX,
  LINK_RULES,
  LONG_ANSWER_MAX,
  MIN_ANSWER,
  SHORT_ANSWER_MAX,
  isLinkQuestion,
  optionsFor,
  pickedOptions,
  setTitle,
  setsFor,
  visibleQuestions,
  type Question,
} from "@/lib/utils/joinQuestions";
import { PHONE_PATTERN, onDigitsChange } from "@/lib/utils/phone";
import { PRN_PATTERN, SRN_PATTERN, type SrnPrnKind } from "@/lib/utils/srn";
import type { ApplicationDomain, JoinAnswers } from "@/types/settings";

/* FY26 recruitment domains. S81: DOMAINS, their display labels and every page
   3/4 question now live in lib/utils/joinQuestions, shared with /api/join, so
   the form and the server validate the same rules. The stored domain values
   still have to match the DB CHECKs in migrations/004. */
type Domain = ApplicationDomain;

/* S81: the two recruitment tracks at the top of step 4. Only a track that
   contains one of the applicant's domains is shown, naming only their domains
   -- nothing about domains they did not pick (owner decision). */
const PROCESS_TRACKS: { domains: readonly Domain[]; stages: readonly string[] }[] = [
  { domains: ["Social Media", "Operations", "Sponsorship"], stages: ["Application Form", "Interview"] },
  { domains: ["Coding", "Robotics", "Automotives"], stages: ["Application Form", "Domain-Specific Test", "Interview"] },
];

const SEMESTERS = [
  { value: "1", label: "1st" },
  { value: "3", label: "3rd" },
  { value: "5", label: "5th" },
] as const;

/* S73F: SRN and PRN are both 13 characters but different structures, so the
   student picks which one they are typing and the field validates that one.
   The API accepts either -- the toggle exists so the browser can give a precise
   error instead of "one of two formats". */
const ID_KINDS = [
  { value: "SRN", label: "SRN", example: "PES1UG21CS999", pattern: SRN_PATTERN },
  { value: "PRN", label: "PRN", example: "PES1201912345", pattern: PRN_PATTERN },
] as const satisfies readonly { value: SrnPrnKind; label: string; example: string; pattern: string }[];

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
  course: "" | (typeof COURSES)[number];
  course_other: string;
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

/* S81: pages 3 and 4 ask full-sentence questions. Tracked mono caps
   (labelStyle) is fine for "Full name" but unreadable at that length, so the
   questions get the body face in sentence case. Page 1 keeps labelStyle. */
const questionStyle: React.CSSProperties = {
  display: "block",
  padding: 0,
  fontFamily: "var(--font-space), sans-serif",
  fontSize: "0.98rem",
  fontWeight: 500,
  lineHeight: 1.5,
  color: "var(--text-primary)",
  marginBottom: "0.5rem",
};

const helpStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  lineHeight: 1.55,
  color: "var(--text-secondary)",
  marginBottom: "0.5rem",
};

const textareaStyle: React.CSSProperties = {
  resize: "vertical",
  minHeight: "120px",
  fontFamily: "var(--font-space), sans-serif",
  lineHeight: 1.6,
};

/* S81: the site's callout treatment (card, hairline border, accent rule -- as
   on /sponsors). Neutral on purpose: not --error, not --warning. */
const noteStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderLeft: "2px solid var(--accent)",
  padding: "0.95rem 1.1rem",
};

function Req() {
  return <span style={{ color: "var(--accent)" }}> *</span>;
}

function Optional() {
  return <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}> (optional)</span>;
}

// S81: module scope, not inline in the component. Once S81 made JoinClient
// analysable by the React compiler, it flagged the global write
// (react-hooks/immutability); out here it is plain browser code.
function markApplied() {
  document.cookie = "vg_applied=1; max-age=" + 60 * 60 * 24 * 30 + "; path=/; SameSite=Lax";
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
    course: "",
    course_other: "",
    website: "",
  });
  // S81: every page 3/4 answer, keyed by question id. Kept across domain
  // changes so going Back does not wipe anything; submit sends only the
  // selected domains' answers.
  const [answers, setAnswers] = useState<JoinAnswers>({});
  const [idKind, setIdKind] = useState<SrnPrnKind>("SRN");
  const activeIdKind = ID_KINDS.find((k) => k.value === idKind) ?? ID_KINDS[0];
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const setAnswer = (id: string, value: string | string[]) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));
  const textAnswer = (id: string) => {
    const v = answers[id];
    return typeof v === "string" ? v : "";
  };
  // What is on screen right now: general questions + selected sets, minus
  // anything a Design / Social Media or Automotives / Robotics checkbox hides.
  // The same walk /api/join runs, so "shown" means the same thing on both sides.
  const visible = visibleQuestions(selectedDomains, answers);

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
     only the tile selectors and checkbox groups need JS checks here. */
  const validateStep = (s: Step): string | null => {
    if (s === 1 && !form.semester) return "Please pick your current semester.";
    if (s === 2 && selectedDomains.length === 0) return "Please pick at least one domain.";
    if (s === 4) {
      const unpicked = visible.find(
        (q) => q.kind === "multi" && q.required && pickedOptions(q, selectedDomains, answers[q.id]).length === 0
      );
      if (unpicked) return `Please pick at least one option for "${unpicked.label}"`;
    }
    return null;
  };

  /* Only VISIBLE questions are sent, so a deselected domain's set, or a Design
     question after unticking Design, is dropped here. The server applies the
     same filter (parseJoinAnswers) rather than trusting this one. */
  const answersPayload = (): JoinAnswers => {
    const payload: JoinAnswers = {};
    for (const q of visible) {
      if (q.kind === "multi") {
        const picked = pickedOptions(q, selectedDomains, answers[q.id]);
        if (picked.length) payload[q.id] = picked;
        if (q.otherId && picked.includes("Other")) payload[q.otherId] = textAnswer(q.otherId);
      } else if (answers[q.id] !== undefined) {
        payload[q.id] = answers[q.id] as string;
      }
    }
    return payload;
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
          course: form.course,
          course_other: form.course === "Other" ? form.course_other : null,
          domain_interest: selectedDomains[0],
          domain_interest_2: selectedDomains[1] ?? null,
          domain_interest_3: selectedDomains[2] ?? null,
          answers: answersPayload(),
          website: form.website, // honeypot
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong on our side. Please try again.");
        setStatus("error");
      } else {
        markApplied();
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

  // Selected domains' question sets, in tile order. Automotives and Robotics
  // share one set; its title names only the ones picked.
  const domainSets = setsFor(selectedDomains);

  // Process tracks narrowed to the applicant's own domains; empty tracks vanish.
  const myTracks = PROCESS_TRACKS.flatMap((track) => {
    const mine = track.domains.filter((d) => selectedDomains.includes(d));
    return mine.length ? [{ mine, stages: track.stages }] : [];
  });

  /* S81: one renderer for every page 3/4 question, driven by the shared
     definitions, so required / maxLength / pattern here are the same values
     /api/join enforces. Link inputs never get `required`. */
  const renderQuestion = (q: Question) => {
    const inputId = `join-${q.id}`;

    if (q.kind === "multi") {
      // Effective selection: a stale tick for a domain since deselected on
      // step 2 does not count, matching what the server will accept.
      const picked = pickedOptions(q, selectedDomains, answers[q.id]);
      const otherId = q.otherId;
      return (
        <fieldset key={q.id} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
          <legend style={questionStyle}>
            {q.label}
            {q.required ? <Req /> : <Optional />}
          </legend>
          {q.help && <p style={helpStyle}>{q.help}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.8rem 1rem", marginTop: "0.35rem" }}>
            {optionsFor(q, selectedDomains).map((o) => (
              <label key={o} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.92rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={picked.includes(o)}
                  onChange={(e) => {
                    setAnswer(q.id, e.target.checked ? [...picked, o] : picked.filter((x) => x !== o));
                    clearError();
                  }}
                  style={{ accentColor: "var(--accent)", width: "1rem", height: "1rem", margin: 0, flexShrink: 0 }}
                />
                {o}
              </label>
            ))}
          </div>
          {otherId && picked.includes("Other") && (
            <input
              id={`join-${otherId}`}
              type="text"
              value={textAnswer(otherId)}
              onChange={(e) => setAnswer(otherId, e.target.value)}
              required
              maxLength={SHORT_ANSWER_MAX}
              aria-label={`${q.label} Other`}
              placeholder="Tell us what else"
              className="join-input"
              style={{ marginTop: "0.9rem" }}
            />
          )}
        </fieldset>
      );
    }

    if (q.kind === "text") {
      return (
        <div key={q.id}>
          <label htmlFor={inputId} style={questionStyle}>
            {q.label}
            {q.required ? <Req /> : <Optional />}
          </label>
          {q.help && <p style={helpStyle}>{q.help}</p>}
          <textarea
            id={inputId}
            value={textAnswer(q.id)}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            required={q.required}
            // Native minLength only fires on a non-empty value, so an optional
            // answer can still be left blank -- the same rule as the server.
            minLength={MIN_ANSWER}
            maxLength={LONG_ANSWER_MAX}
            rows={4}
            className="join-input"
            style={textareaStyle}
          />
        </div>
      );
    }

    // Link fields: always optional. An empty value skips `pattern` entirely,
    // so leaving the field blank can never block the form. Pattern, tooltip and
    // placeholder come from LINK_RULES, the same row /api/join validates with.
    const rule = LINK_RULES[q.kind];
    return (
      <div key={q.id}>
        <label htmlFor={inputId} style={questionStyle}>
          {q.label}
          <Optional />
        </label>
        <input
          id={inputId}
          type="url"
          value={textAnswer(q.id)}
          onChange={(e) => setAnswer(q.id, e.target.value)}
          maxLength={LINK_MAX}
          pattern={rule.pattern}
          title={`Use ${rule.hint}, or leave it empty`}
          placeholder={rule.placeholder}
          className="join-input"
        />
        {q.help && <p style={{ ...helpStyle, marginTop: "0.5rem", marginBottom: 0 }}>{q.help}</p>}
      </div>
    );
  };

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
            Robotics · Operations · {DOMAIN_LABELS["Social Media"]}
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
                {/* S81: owner-requested note, shown before anything is filled in.
                    Firm about low-effort and AI-written answers, warm for everyone
                    else. The AI line is repeated, quieter, above the submit button. */}
                <div role="note" style={noteStyle}>
                  <p style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                    Before you start
                  </p>
                  <p style={{ marginTop: "0.3rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    Our domain leads read every application, and there are no right or wrong
                    answers, just honest ones. Take your time. Applications with one-word or
                    low-effort answers may not be taken forward.
                  </p>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    {"We'd rather hear from you than from an AI, so please write your answers yourself. Responses that are clearly AI-generated won't be considered."}
                  </p>
                </div>

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
                    Mobile number (10 digits)<Req />
                  </label>
                  <input
                    id="join-mobile"
                    type="tel"
                    name="mobile_number"
                    value={form.mobile_number}
                    // S76B: not the shared handleChange -- that writes the raw
                    // keystroke straight into state, which is how a letter reached
                    // this field at all. onDigitsChange filters first.
                    onChange={onDigitsChange((mobile_number) =>
                      setForm((prev) => ({ ...prev, mobile_number }))
                    )}
                    required
                    inputMode="numeric"
                    maxLength={10}
                    pattern={PHONE_PATTERN}
                    title="10 digits only -- no country code, no spaces"
                    placeholder="9876543210"
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
                    10 digits only -- no country code, no spaces
                  </p>
                </div>

                <div>
                  <label htmlFor="join-srn" style={labelStyle}>
                    {activeIdKind.label}<Req />
                  </label>
                  {/* Same tile treatment as the Semester selector -- a mode
                      switch the student sets before typing, not a second field. */}
                  <div
                    role="group"
                    aria-label="Identifier type"
                    style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)", marginBottom: "0.85rem" }}
                  >
                    {ID_KINDS.map((k) => (
                      <button
                        key={k.value}
                        type="button"
                        className="join-domain-tile"
                        aria-pressed={idKind === k.value}
                        onClick={() => {
                          setIdKind(k.value);
                          clearError();
                        }}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
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
                    maxLength={13}
                    pattern={activeIdKind.pattern}
                    title={`13 characters, like ${activeIdKind.example} -- check the SRN / PRN toggle if this is the other one`}
                    placeholder={activeIdKind.example}
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

                {/* S81: Course. "Other" reveals a required free-text box, and the
                    server stores that text as `course`. */}
                <div>
                  <label htmlFor="join-course" style={labelStyle}>
                    Course<Req />
                  </label>
                  <select
                    id="join-course"
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    required
                    className="join-input"
                  >
                    <option value="" disabled>
                      Select your course
                    </option>
                    {COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {form.course === "Other" && (
                    <input
                      id="join-course-other"
                      type="text"
                      name="course_other"
                      value={form.course_other}
                      onChange={handleChange}
                      required
                      maxLength={SHORT_ANSWER_MAX}
                      aria-label="Your course"
                      placeholder="Your course"
                      className="join-input"
                      style={{ marginTop: "0.75rem" }}
                    />
                  )}
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
                        {DOMAIN_LABELS[d]}
                      </button>
                    );
                  })}
                </div>
                <p className="mono" style={{ marginTop: "0.6rem", fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--text-muted)" }}>
                  {selectedDomains.length} / {MAX_DOMAINS} DOMAINS SELECTED
                </p>
              </div>
            )}

            {step === 3 && <>{GENERAL_QUESTIONS.map(renderQuestion)}</>}

            {step === 4 && (
              <>
                {/* S81 F1: always shown, listing only the applicant's own tracks. */}
                <section
                  aria-labelledby="join-process-heading"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)", padding: "1.25rem 1.25rem 1.4rem" }}
                >
                  <h3 id="join-process-heading" className="heading" style={{ fontSize: "0.95rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Recruitment Process
                  </h3>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    {"Here's what the process looks like for the domains you picked:"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.1rem" }}>
                    {myTracks.map(({ mine, stages }) => (
                      <div key={mine.join()} style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "0.9rem" }}>
                        <p className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.6, color: "var(--text-primary)" }}>
                          {mine.map((d) => DOMAIN_LABELS[d]).join(" · ")}
                        </p>
                        <p style={{ marginTop: "0.3rem", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                          {stages.map((s) => `-> ${s}`).join(" ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <div>
                  <h3 className="heading" style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.3rem)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Domain Specific Questions
                  </h3>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.95rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                    A few questions about the domains you picked.
                  </p>
                </div>

                {/* Only visible questions render, so only they are validated --
                    native `required` ignores fields that are not in the DOM. */}
                {domainSets.map((set) => (
                  <section
                    key={set.domains.join()}
                    style={{ display: "flex", flexDirection: "column", gap: "2.25rem", borderTop: "1px solid var(--border)", paddingTop: "1.75rem" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <h4 className="heading" style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent)" }}>
                        {setTitle(set, selectedDomains)}
                      </h4>
                      {/* S81 F2: only on the sets that carry a link field. */}
                      {set.questions.some(isLinkQuestion) && (
                        <div role="note" style={noteStyle}>
                          <p style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                            {"No portfolio ready? That's okay."}
                          </p>
                          <p style={{ marginTop: "0.3rem", fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                            Links are optional and just a bonus. Everyone is evaluated fairly, with or without one.
                          </p>
                        </div>
                      )}
                    </div>
                    {set.questions.filter((q) => visible.includes(q)).map(renderQuestion)}
                  </section>
                ))}
              </>
            )}

            {status === "error" && (
              <p style={{ color: "var(--error)", fontSize: "0.875rem" }}>{errorMsg}</p>
            )}

            {/* S81: the closing half of the page 1 AI line -- one quiet line, step 4 only. */}
            {step === 4 && (
              <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                {"One last thing before you submit: please make sure these answers are your own. Clearly AI-written responses won't be considered."}
              </p>
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

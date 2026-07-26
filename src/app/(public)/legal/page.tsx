import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Privacy policy and terms of service for Team Vegavath, including what data each form on this site collects, who processes it, and how long it is kept.",
  alternates: { canonical: "/legal" },
};

export const revalidate = 120;

export default function LegalPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden" }}>
      <div className="mx-auto" style={{ width: "100%", maxWidth: "720px", padding: "8rem 1.5rem 5rem", boxSizing: "border-box" }}>
        <p className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Last updated: 26 July 2026
        </p>

        <header style={{ margin: "1.25rem 0 3.5rem" }}>
          <h1 className="heading" style={{ fontSize: "clamp(2.2rem, 6vw, 3.2rem)", fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)" }}>
            LEGAL
          </h1>
          <p className="mono" style={{ marginTop: "0.6rem", fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Team Vegavath · PESU ECC
          </p>
        </header>

        <article style={{ display: "flex", flexDirection: "column", gap: "3.5rem" }}>
          <section>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", marginBottom: "1.75rem" }}>
              Privacy Policy
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", color: "var(--text-secondary)" }}>
              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>1. Information We Collect</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We only collect information you enter into a form on this site. There are five
                  such forms, and this is everything each one collects:
                </p>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Club application (/join):</strong>{" "}
                    name, email address, mobile number, SRN or PRN, semester, your written answers
                    about why you want to join, and any portfolio links you choose to share.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Event registration:</strong>{" "}
                    name, email address, phone number, SRN, and an optional message.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Bootstrap visitor check-in:</strong>{" "}
                    name, PRN, and phone number, used to assign you to a tour group and to count
                    attendance on the day.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Bootstrap volunteer registration:</strong>{" "}
                    display name, SRN (which becomes your username), phone number, and a login code
                    for the volunteer dashboard. Organisers can see volunteer login codes, so do not
                    reuse a password you use anywhere else.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Bootstrap feedback:</strong>{" "}
                    ratings and free-text comments only. This form is anonymous and collects no
                    name, email or phone number.
                  </li>
                </ul>
                <p style={{ fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  We do not run a newsletter or any marketing email list, and we do not use
                  analytics or advertising trackers.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>2. How We Use Your Information</h3>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7 }}>
                  <li>To assess club applications and contact applicants about the outcome</li>
                  <li>To manage event registrations and hackathon participation</li>
                  <li>To run Bootstrap: assign visitor groups, issue volunteer accounts, and count attendance</li>
                  <li>To summarise anonymous event feedback so we can improve the next event</li>
                </ul>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>3. Data Protection</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We implement reasonable security measures to protect your personal information.
                  However, no method of transmission over the Internet is 100% secure. We store
                  data securely and limit access to authorized personnel only.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>4. Third-Party Services</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We do not sell or rent your personal information to anyone. Four service
                  providers process data on our behalf, and these are all of them:
                </p>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Vercel</strong> hosts this
                    website and serves every page request.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Neon</strong> hosts the
                    Postgres database where all form submissions are stored.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Cloudflare R2</strong> stores
                    the photographs, videos and other media shown on this site.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Google Gemini</strong>{" "}
                    generates written summaries of Bootstrap feedback. Only the anonymous ratings
                    and comments are sent; no name, email, phone number or SRN is included.
                  </li>
                </ul>
                <p style={{ fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  These providers operate outside India, so your data is processed abroad. Each has
                  its own privacy policy governing how it handles data on our behalf.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>5. How Long We Keep Your Data</h3>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7 }}>
                  <li>
                    Club applications are kept for the recruitment cycle they were submitted in and
                    for up to one year afterwards, then deleted.
                  </li>
                  <li>
                    Bootstrap session data, including visitor check-ins, volunteer accounts and
                    feedback, is deleted when an administrator deletes the session.
                  </li>
                  <li>
                    Event registrations are kept while the event is being organised and run.
                  </li>
                </ul>
                <p style={{ fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  You can ask us to delete your data sooner using the contact address below.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>6. Cookies</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We use no analytics or advertising cookies. The only cookies this site sets are
                  the ones it needs to function: an admin panel session cookie, a Bootstrap
                  volunteer login cookie, and a cookie that remembers you have already submitted a
                  club application. Because all three are strictly necessary, this site does not
                  need a cookie consent banner.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>7. Your Rights</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  You have the right to access, correct, or delete the personal information we hold
                  about you. Email the address in section 9 and tell us which form you submitted and
                  roughly when, so we can find your record.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>8. Changes to Privacy Policy</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We may update this policy from time to time. Significant changes will be announced
                  on this website and reflected in the date at the top of this page.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>9. Contact Us</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  For any privacy question, data request or complaint, email{" "}
                  <a href="mailto:teamvegavathracing@pes.edu" className="legal-link">
                    teamvegavathracing@pes.edu
                  </a>
                  . This is the address to use for access, correction and deletion requests, and it
                  is the route for raising a grievance about how we have handled your data.
                </p>
              </section>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.04em", color: "var(--text-primary)", marginBottom: "1.75rem" }}>
              Terms of Service
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", color: "var(--text-secondary)" }}>
              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>1. Acceptance of Terms</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  By accessing and using the Team Vegavath website and services, you accept and
                  agree to be bound by these Terms of Service. If you do not agree, please do not
                  use our services.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>2. About Team Vegavath</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  Team Vegavath is a student-run technical club at PES University, Electronic City
                  Campus (PESU ECC). We organize workshops, hackathons, tech talks, and other
                  events across six domains: Coding, Automotives, Robotics, Sponsorship,
                  Operations, and Social Media. Participation is voluntary and subject to these
                  terms.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>3. User Responsibilities</h3>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7 }}>
                  <li>Provide accurate information during registration</li>
                  <li>Respect other members and maintain professional conduct</li>
                  <li>Follow event rules and guidelines</li>
                  <li>Not misuse or abuse our services or platform</li>
                  <li>Respect intellectual property rights</li>
                </ul>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>4. Event Participation</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  Event registrations are subject to availability. We reserve the right to cancel
                  or modify events. Participants must adhere to specific event rules and code of
                  conduct. Team Vegavath is not liable for any injuries or damages during events.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>5. Intellectual Property</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  The website&apos;s source code is licensed under the Team Vegavath Custom
                  Educational License (see below). Team Vegavath branding, trademarks, logos,
                  proprietary 3D models, member portraits, crew data, event gallery photographs,
                  and organization-specific copywriting remain the property of Team Vegavath and
                  may not be reused. Projects created during hackathons belong to their respective
                  teams. We may feature projects and photos from events on our platforms with
                  appropriate credit.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>6. License</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  This project is source-available under the{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    Team Vegavath Custom Educational License
                  </strong>{" "}
                  (derived from MIT). In summary, per the license text:
                </p>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  <li>
                    You may view, learn from, and fork the software for personal and educational
                    purposes.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Non-commercial &amp; non-competitive use:</strong>{" "}
                    the software may not be used, hosted, or distributed for any commercial
                    purpose, or deployed as a competing website, template, or platform for another
                    organization, university club, or entity without explicit written permission
                    from Team Vegavath core administration.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Asset protection:</strong>{" "}
                    Team Vegavath branding, trademarks and logos, proprietary 3D models, team
                    member portraits, crew data, event gallery photographs, and
                    organization-specific copywriting are strictly protected and may not be
                    reused, extracted, distributed, or modified under any circumstances.
                  </li>
                  <li>
                    <strong style={{ color: "var(--text-primary)" }}>Attribution:</strong>{" "}
                    the copyright and permission notice must be included in all copies or
                    substantial portions of the source code.
                  </li>
                </ul>
                <p style={{ fontSize: "16px", lineHeight: 1.7, marginTop: "0.75rem" }}>
                  The software is provided &quot;as is&quot;, without warranty of any kind. See the{" "}
                  <a
                    href="https://github.com/Team-Vegavath/team-vegavath-website/blob/master/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="legal-link"
                  >
                    full license text
                  </a>{" "}
                  in the repository for the binding terms.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>7. Disclaimer</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  Services are provided &quot;as is&quot; without warranties. We are not liable for any
                  direct, indirect, or consequential damages arising from use of our services.
                  As a student club, resources and services may change without notice.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>8. Modifications</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We reserve the right to modify these terms at any time. Continued use of our
                  services after changes constitutes acceptance of modified terms.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>9. Termination</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We reserve the right to terminate or suspend access to our services for users
                  who violate these terms or engage in harmful behavior.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>10. Contact &amp; Disputes</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  For questions about these terms, email{" "}
                  <a href="mailto:teamvegavathracing@pes.edu" className="legal-link">
                    teamvegavathracing@pes.edu
                  </a>
                  . Any disputes will be handled in good faith through our club administration.
                </p>
              </section>
            </div>
          </section>

          <section style={{ borderTop: "1px solid var(--border-strong)", paddingTop: "1.75rem" }}>
            <p className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
              Source Available
            </p>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
              This website&apos;s code is published under the Team Vegavath Custom Educational
              License. View the source on{" "}
              <a
                href="https://github.com/Team-Vegavath/team-vegavath-website"
                target="_blank"
                rel="noopener noreferrer"
                className="legal-link"
              >
                GitHub
              </a>
              .
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}

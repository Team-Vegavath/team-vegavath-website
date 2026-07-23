import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
};

export const revalidate = 120;

export default function LegalPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "720px", padding: "8rem 1.5rem 5rem", boxSizing: "border-box" }}>
        <p className="mono" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Last updated: 07 July 2026
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
                  We collect information you provide when registering for events, joining our club,
                  or subscribing to our newsletter. This may include your name, email address,
                  university details, and contact information.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>2. How We Use Your Information</h3>
                <ul style={{ listStyle: "disc", listStylePosition: "inside", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "16px", lineHeight: 1.7 }}>
                  <li>To communicate about club events and activities</li>
                  <li>To manage event registrations and hackathon participation</li>
                  <li>To send newsletters and important updates</li>
                  <li>To improve our website and services</li>
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
                  We may use third-party services (like email providers and analytics tools)
                  that have their own privacy policies. We do not sell or rent your personal
                  information to third parties.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>5. Cookies</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  Our website may use cookies to enhance user experience and analyze site traffic.
                  You can choose to disable cookies through your browser settings.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>6. Your Rights</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  You have the right to access, correct, or delete your personal information.
                  You can unsubscribe from our communications at any time. Contact us to exercise
                  these rights.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>7. Changes to Privacy Policy</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  We may update this policy from time to time. We will notify users of significant
                  changes via email or website announcement.
                </p>
              </section>

              <section>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.6rem" }}>8. Contact Us</h3>
                <p style={{ fontSize: "16px", lineHeight: 1.7 }}>
                  For privacy-related questions or concerns, please contact us through our official
                  channels or email.
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
                  events across domains including Coding, Automotives, Robotics, Design,
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
                  For questions about these terms, please contact us through official channels.
                  Any disputes will be handled in good faith through our club administration.
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

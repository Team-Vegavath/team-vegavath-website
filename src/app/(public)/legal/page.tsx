import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal | Team Vegavath",
};

export const revalidate = 120;

export default function LegalPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#121212", color: "#EBEBEB", overflowX: "hidden" }}>
      <div style={{ margin: "0 auto", width: "100%", maxWidth: "80rem", padding: "6rem 1.5rem 4rem", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "9999px",
              border: "1px solid #3f3f46",
              padding: "0.4rem 1rem",
              fontSize: "0.8rem",
              color: "#a1a1aa",
              textDecoration: "none",
              transition: "all 0.2s",
              width: "fit-content",
            }}
          >
            ← Back to home
          </Link>
        </div>

        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-[#EBEBEB] md:text-5xl">
            Legal Information
          </h1>
          <p className="text-lg text-[#9a9a9a]">Privacy Policy &amp; Terms of Service</p>
          <p className="mt-2 text-sm text-[#9a9a9a]">Last Updated: October 25, 2025</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 28rem), 1fr))", gap: "2rem" }}>
          <div style={{ borderRadius: "0.75rem", border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "2rem 1.5rem", boxSizing: "border-box" }}>
            <h2 className="mb-6 flex items-center gap-3 text-3xl font-bold text-[#EBEBEB]">
              <span className="text-[#EF5D08]">🔒</span>
              Privacy Policy
            </h2>

            <div className="space-y-6 text-[#9a9a9a]">
              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">1. Information We Collect</h3>
                <p className="text-sm leading-relaxed">
                  We collect information you provide when registering for events, joining our club,
                  or subscribing to our newsletter. This may include your name, email address,
                  university details, and contact information.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">2. How We Use Your Information</h3>
                <ul className="list-inside list-disc space-y-2 text-sm">
                  <li>To communicate about club events and activities</li>
                  <li>To manage event registrations and hackathon participation</li>
                  <li>To send newsletters and important updates</li>
                  <li>To improve our website and services</li>
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">3. Data Protection</h3>
                <p className="text-sm leading-relaxed">
                  We implement reasonable security measures to protect your personal information.
                  However, no method of transmission over the Internet is 100% secure. We store
                  data securely and limit access to authorized personnel only.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">4. Third-Party Services</h3>
                <p className="text-sm leading-relaxed">
                  We may use third-party services (like email providers and analytics tools)
                  that have their own privacy policies. We do not sell or rent your personal
                  information to third parties.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">5. Cookies</h3>
                <p className="text-sm leading-relaxed">
                  Our website may use cookies to enhance user experience and analyze site traffic.
                  You can choose to disable cookies through your browser settings.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">6. Your Rights</h3>
                <p className="text-sm leading-relaxed">
                  You have the right to access, correct, or delete your personal information.
                  You can unsubscribe from our communications at any time. Contact us to exercise
                  these rights.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">7. Changes to Privacy Policy</h3>
                <p className="text-sm leading-relaxed">
                  We may update this policy from time to time. We will notify users of significant
                  changes via email or website announcement.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">8. Contact Us</h3>
                <p className="text-sm leading-relaxed">
                  For privacy-related questions or concerns, please contact us through our official
                  channels or email.
                </p>
              </section>
            </div>
          </div>

          <div style={{ borderRadius: "0.75rem", border: "1px solid #2a2a2a", background: "#1a1a1a", padding: "2rem 1.5rem", boxSizing: "border-box" }}>
            <h2 className="mb-6 flex items-center gap-3 text-3xl font-bold text-[#EBEBEB]">
              <span className="text-[#EF5D08]">📜</span>
              Terms of Service
            </h2>

            <div className="space-y-6 text-[#9a9a9a]">
              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">1. Acceptance of Terms</h3>
                <p className="text-sm leading-relaxed">
                  By accessing and using the Team Vegavath website and services, you accept and
                  agree to be bound by these Terms of Service. If you do not agree, please do not
                  use our services.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">2. About Team Vegavath</h3>
                <p className="text-sm leading-relaxed">
                  Team Vegavath is a student-run technical club at PES University, Electronic City
                  Campus (PESU ECC). We organize workshops, hackathons, tech talks, and other
                  events across domains including Coding, Automotives, Robotics, Design,
                  Operations, and Social Media. Participation is voluntary and subject to these
                  terms.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">3. User Responsibilities</h3>
                <ul className="list-inside list-disc space-y-2 text-sm">
                  <li>Provide accurate information during registration</li>
                  <li>Respect other members and maintain professional conduct</li>
                  <li>Follow event rules and guidelines</li>
                  <li>Not misuse or abuse our services or platform</li>
                  <li>Respect intellectual property rights</li>
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">4. Event Participation</h3>
                <p className="text-sm leading-relaxed">
                  Event registrations are subject to availability. We reserve the right to cancel
                  or modify events. Participants must adhere to specific event rules and code of
                  conduct. Team Vegavath is not liable for any injuries or damages during events.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">5. Intellectual Property</h3>
                <p className="text-sm leading-relaxed">
                  The website and its content are licensed under the MIT License. Projects created
                  during hackathons belong to their respective teams. We may feature projects and
                  photos from events on our platforms with appropriate credit.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">6. MIT License</h3>
                <p className="text-sm leading-relaxed">
                  This project is open source under the MIT License. You may use, modify, and
                  distribute the code with proper attribution. See our GitHub repository for
                  full license details.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">7. Disclaimer</h3>
                <p className="text-sm leading-relaxed">
                  Services are provided "as is" without warranties. We are not liable for any
                  direct, indirect, or consequential damages arising from use of our services.
                  As a student club, resources and services may change without notice.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">8. Modifications</h3>
                <p className="text-sm leading-relaxed">
                  We reserve the right to modify these terms at any time. Continued use of our
                  services after changes constitutes acceptance of modified terms.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">9. Termination</h3>
                <p className="text-sm leading-relaxed">
                  We reserve the right to terminate or suspend access to our services for users
                  who violate these terms or engage in harmful behavior.
                </p>
              </section>

              <section>
                <h3 className="mb-3 text-xl font-semibold text-[#EBEBEB]">10. Contact &amp; Disputes</h3>
                <p className="text-sm leading-relaxed">
                  For questions about these terms, please contact us through official channels.
                  Any disputes will be handled in good faith through our club administration.
                </p>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block rounded-lg border border-[#EF5D08]/30 bg-[#1a1a1a] p-6">
            <p className="mb-2 text-sm text-[#9a9a9a]">
              <span className="font-semibold text-[#EF5D08]">Open Source Project</span>
            </p>
            <p className="text-xs text-[#9a9a9a]">
              This website is licensed under the MIT License.
              <br />
              View the source code on{" "}
              <a
                href="https://github.com/Team-Vegavath/Website"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EF5D08] underline transition-colors hover:text-[#EBEBEB]"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

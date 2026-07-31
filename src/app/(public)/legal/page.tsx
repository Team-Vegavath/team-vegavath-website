import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description:
    "Privacy policy and terms of service for Team Vegavath, including what data each form on this site collects, who processes it, and how long it is kept.",
  alternates: { canonical: "/legal" },
};

export const revalidate = 120;

// S68: the contents block is driven off this list, and every id below is stamped
// on the matching <section>. Two lists to keep in step is the deliberate trade:
// the alternative is turning 19 bespoke clauses into data, and the bodies are
// all one-off prose. Labels carry their own numbering so the contents entry and
// the heading it points at can never disagree about which clause is which.
const LEGAL_CONTENTS = [
  {
    title: "Privacy Policy",
    items: [
      { id: "information-we-collect", label: "1. Information We Collect" },
      { id: "how-we-use-your-information", label: "2. How We Use Your Information" },
      { id: "data-protection", label: "3. Data Protection" },
      { id: "third-party-services", label: "4. Third-Party Services" },
      { id: "how-long-we-keep-your-data", label: "5. How Long We Keep Your Data" },
      { id: "cookies", label: "6. Cookies" },
      { id: "your-rights", label: "7. Your Rights" },
      { id: "changes-to-privacy-policy", label: "8. Changes to Privacy Policy" },
      { id: "contact-us", label: "9. Contact Us" },
    ],
  },
  {
    title: "Terms of Service",
    items: [
      { id: "acceptance-of-terms", label: "1. Acceptance of Terms" },
      { id: "about-team-vegavath", label: "2. About Team Vegavath" },
      { id: "user-responsibilities", label: "3. User Responsibilities" },
      { id: "event-participation", label: "4. Event Participation" },
      { id: "intellectual-property", label: "5. Intellectual Property" },
      { id: "license", label: "6. License" },
      { id: "disclaimer", label: "7. Disclaimer" },
      { id: "modifications", label: "8. Modifications" },
      { id: "termination", label: "9. Termination" },
      { id: "contact-and-disputes", label: "10. Contact & Disputes" },
    ],
  },
];

export default function LegalPage() {
  return (
    <main className="legal-page">
      <div className="mx-auto legal-shell">
        <p className="legal-updated">Last updated: 1 August 2026</p>

        <header className="legal-head">
          <h1 className="legal-title">LEGAL</h1>
          <p className="legal-org">Team Vegavath &middot; PESU ECC</p>
        </header>

        <nav className="legal-toc" aria-label="Contents">
          <p className="legal-toc-label">Contents</p>
          <div className="legal-toc-cols">
            {LEGAL_CONTENTS.map((group) => (
              <div key={group.title}>
                <p className="legal-toc-group-label">{group.title}</p>
                {group.items.map((item) => (
                  <a key={item.id} href={`#${item.id}`} className="legal-toc-link">
                    {item.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </nav>

        <article className="legal-doc">
          <section id="privacy-policy">
            <h2 className="legal-h2">Privacy Policy</h2>

            <div className="legal-body">
              <section id="information-we-collect" className="legal-clause">
                <h3 className="legal-h3">1. Information We Collect</h3>
                <p className="legal-p">
                  We only collect information you enter into a form on this site. There are five
                  such forms, and this is everything each one collects:
                </p>
                <ul className="legal-list">
                  <li>
                    <strong>Club application (/join):</strong>{" "}
                    name, email address, mobile number, SRN or PRN, semester, your written answers
                    about why you want to join, and any portfolio links you choose to share.
                  </li>
                  <li>
                    <strong>Event registration:</strong>{" "}
                    name, email address, phone number, SRN, and an optional message.
                  </li>
                  <li>
                    <strong>Bootstrap visitor check-in:</strong>{" "}
                    name, PRN, and phone number, used to assign you to a tour group and to count
                    attendance on the day.
                  </li>
                  <li>
                    <strong>Bootstrap volunteer registration:</strong>{" "}
                    display name, SRN (which becomes your username), phone number, and a login code
                    for the volunteer dashboard. Organisers can see volunteer login codes, so do not
                    reuse a password you use anywhere else.
                  </li>
                  <li>
                    <strong>Bootstrap feedback:</strong>{" "}
                    ratings and free-text comments only. This form is anonymous and collects no
                    name, email or phone number.
                  </li>
                </ul>
                <p className="legal-p">
                  We do not run a newsletter or any marketing email list, and we do not use
                  analytics or advertising trackers.
                </p>
              </section>

              <section id="how-we-use-your-information" className="legal-clause">
                <h3 className="legal-h3">2. How We Use Your Information</h3>
                <ul className="legal-list">
                  <li>To assess club applications and contact applicants about the outcome</li>
                  <li>To manage event registrations and hackathon participation</li>
                  <li>To run Bootstrap: assign visitor groups, issue volunteer accounts, and count attendance</li>
                  <li>To summarise anonymous event feedback so we can improve the next event</li>
                </ul>
              </section>

              <section id="data-protection" className="legal-clause">
                <h3 className="legal-h3">3. Data Protection</h3>
                <p className="legal-p">
                  We implement reasonable security measures to protect your personal information.
                  However, no method of transmission over the Internet is 100% secure. We store
                  data securely and limit access to authorized personnel only.
                </p>
              </section>

              <section id="third-party-services" className="legal-clause">
                <h3 className="legal-h3">4. Third-Party Services</h3>
                <p className="legal-p">
                  We do not sell or rent your personal information to anyone. Four service
                  providers process data on our behalf, and these are all of them:
                </p>
                <ul className="legal-list">
                  <li>
                    <strong>Vercel</strong> hosts this website and serves every page request.
                  </li>
                  <li>
                    <strong>Neon</strong> hosts the Postgres database where all form submissions
                    are stored.
                  </li>
                  <li>
                    <strong>Cloudflare R2</strong> stores the photographs, videos and other media
                    shown on this site.
                  </li>
                  <li>
                    <strong>Google Gemini</strong> generates written summaries of Bootstrap
                    feedback. Only the anonymous ratings and comments are sent; no name, email,
                    phone number or SRN is included.
                  </li>
                </ul>
                <p className="legal-p">
                  These providers operate outside India, so your data is processed abroad. Each has
                  its own privacy policy governing how it handles data on our behalf.
                </p>
              </section>

              {/* S68 (Section C): this clause promised an automatic one-year
                  deletion of club applications from S52B until now, and no code
                  has ever enforced it -- there is no scheduled job and no sweep.
                  Rewritten to describe what actually happens: retention for as
                  long as the club needs the record, with removal by an
                  administrator on request or at their discretion. No timeline is
                  promised, because none is kept. Section 7 and section 9 are
                  untouched -- the right to request deletion was always real, and
                  a manual request is now the only route, which is why the
                  closing line points at it instead of offering to delete
                  "sooner" than a schedule that does not exist. */}
              <section id="how-long-we-keep-your-data" className="legal-clause">
                <h3 className="legal-h3">5. How Long We Keep Your Data</h3>
                <p className="legal-p">
                  We keep what you submit for as long as the club needs it, and we remove it by
                  hand. Nothing on this site deletes your data automatically or on a fixed
                  schedule, so the periods below describe how we handle records in practice rather
                  than a guaranteed deletion date.
                </p>
                <ul className="legal-list">
                  <li>
                    Club applications are kept for the recruitment cycle they were submitted in,
                    and afterwards for as long as the club needs them for its own records. An
                    administrator removes them manually.
                  </li>
                  <li>
                    Bootstrap session data, including visitor check-ins, volunteer accounts and
                    feedback, is deleted when an administrator deletes the session.
                  </li>
                  <li>
                    Event registrations are kept while the event is being organised and run, and
                    afterwards as a record of who attended until an administrator removes them.
                  </li>
                </ul>
                <p className="legal-p">
                  You can ask us to delete your data at any time using the contact address in{" "}
                  <a href="#contact-us" className="legal-link">
                    section 9
                  </a>
                  , and an administrator will remove it. Because nothing is deleted automatically,
                  asking us is the way to have your data removed.
                </p>
              </section>

              <section id="cookies" className="legal-clause">
                <h3 className="legal-h3">6. Cookies</h3>
                <p className="legal-p">
                  We use no analytics or advertising cookies. The only cookies this site sets are
                  the ones it needs to function: an admin panel session cookie, a Bootstrap
                  volunteer login cookie, and a cookie that remembers you have already submitted a
                  club application. Because all three are strictly necessary, this site does not
                  need a cookie consent banner.
                </p>
              </section>

              <section id="your-rights" className="legal-clause">
                <h3 className="legal-h3">7. Your Rights</h3>
                <p className="legal-p">
                  You have the right to access, correct, or delete the personal information we hold
                  about you. Email the address in{" "}
                  <a href="#contact-us" className="legal-link">
                    section 9
                  </a>{" "}
                  and tell us which form you submitted and roughly when, so we can find your record.
                </p>
              </section>

              <section id="changes-to-privacy-policy" className="legal-clause">
                <h3 className="legal-h3">8. Changes to Privacy Policy</h3>
                <p className="legal-p">
                  We may update this policy from time to time. Significant changes will be announced
                  on this website and reflected in the date at the top of this page.
                </p>
              </section>

              <section id="contact-us" className="legal-clause">
                <h3 className="legal-h3">9. Contact Us</h3>
                <p className="legal-p">
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

          <section id="terms-of-service">
            <h2 className="legal-h2">Terms of Service</h2>

            <div className="legal-body">
              <section id="acceptance-of-terms" className="legal-clause">
                <h3 className="legal-h3">1. Acceptance of Terms</h3>
                <p className="legal-p">
                  By accessing and using the Team Vegavath website and services, you accept and
                  agree to be bound by these Terms of Service. If you do not agree, please do not
                  use our services.
                </p>
              </section>

              <section id="about-team-vegavath" className="legal-clause">
                <h3 className="legal-h3">2. About Team Vegavath</h3>
                <p className="legal-p">
                  Team Vegavath is a student-run technical club at PES University, Electronic City
                  Campus (PESU ECC). We organize workshops, hackathons, tech talks, and other
                  events across six domains: Coding, Automotives, Robotics, Sponsorship,
                  Operations, and Social Media. Participation is voluntary and subject to these
                  terms.
                </p>
              </section>

              <section id="user-responsibilities" className="legal-clause">
                <h3 className="legal-h3">3. User Responsibilities</h3>
                <ul className="legal-list">
                  <li>Provide accurate information during registration</li>
                  <li>Respect other members and maintain professional conduct</li>
                  <li>Follow event rules and guidelines</li>
                  <li>Not misuse or abuse our services or platform</li>
                  <li>Respect intellectual property rights</li>
                </ul>
              </section>

              <section id="event-participation" className="legal-clause">
                <h3 className="legal-h3">4. Event Participation</h3>
                <p className="legal-p">
                  Event registrations are subject to availability. We reserve the right to cancel
                  or modify events. Participants must adhere to specific event rules and code of
                  conduct. Team Vegavath is not liable for any injuries or damages during events.
                </p>
              </section>

              <section id="intellectual-property" className="legal-clause">
                <h3 className="legal-h3">5. Intellectual Property</h3>
                <p className="legal-p">
                  The website&apos;s source code is licensed under the Team Vegavath Custom
                  Educational License (see below). Team Vegavath branding, trademarks, logos,
                  proprietary 3D models, member portraits, crew data, event gallery photographs,
                  and organization-specific copywriting remain the property of Team Vegavath and
                  may not be reused. Projects created during hackathons belong to their respective
                  teams. We may feature projects and photos from events on our platforms with
                  appropriate credit.
                </p>
              </section>

              <section id="license" className="legal-clause">
                <h3 className="legal-h3">6. License</h3>
                <p className="legal-p">
                  This project is source-available under the{" "}
                  <strong>Team Vegavath Custom Educational License</strong> (derived from MIT). In
                  summary, per the license text:
                </p>
                <ul className="legal-list">
                  <li>
                    You may view, learn from, and fork the software for personal and educational
                    purposes.
                  </li>
                  <li>
                    <strong>Non-commercial &amp; non-competitive use:</strong>{" "}
                    the software may not be used, hosted, or distributed for any commercial
                    purpose, or deployed as a competing website, template, or platform for another
                    organization, university club, or entity without explicit written permission
                    from Team Vegavath core administration.
                  </li>
                  <li>
                    <strong>Asset protection:</strong>{" "}
                    Team Vegavath branding, trademarks and logos, proprietary 3D models, team
                    member portraits, crew data, event gallery photographs, and
                    organization-specific copywriting are strictly protected and may not be
                    reused, extracted, distributed, or modified under any circumstances.
                  </li>
                  <li>
                    <strong>Attribution:</strong>{" "}
                    the copyright and permission notice must be included in all copies or
                    substantial portions of the source code.
                  </li>
                </ul>
                <p className="legal-p">
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

              <section id="disclaimer" className="legal-clause">
                <h3 className="legal-h3">7. Disclaimer</h3>
                <p className="legal-p">
                  Services are provided &quot;as is&quot; without warranties. We are not liable for any
                  direct, indirect, or consequential damages arising from use of our services.
                  As a student club, resources and services may change without notice.
                </p>
              </section>

              <section id="modifications" className="legal-clause">
                <h3 className="legal-h3">8. Modifications</h3>
                <p className="legal-p">
                  We reserve the right to modify these terms at any time. Continued use of our
                  services after changes constitutes acceptance of modified terms.
                </p>
              </section>

              <section id="termination" className="legal-clause">
                <h3 className="legal-h3">9. Termination</h3>
                <p className="legal-p">
                  We reserve the right to terminate or suspend access to our services for users
                  who violate these terms or engage in harmful behavior.
                </p>
              </section>

              <section id="contact-and-disputes" className="legal-clause">
                <h3 className="legal-h3">10. Contact &amp; Disputes</h3>
                <p className="legal-p">
                  For questions about these terms, email{" "}
                  <a href="mailto:teamvegavathracing@pes.edu" className="legal-link">
                    teamvegavathracing@pes.edu
                  </a>
                  . Any disputes will be handled in good faith through our club administration.
                </p>
              </section>
            </div>
          </section>

          <section className="legal-foot">
            <p className="legal-foot-label">Source Available</p>
            <p className="legal-foot-text">
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

import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import KartModelWrapper from "@/components/home/KartModelWrapper";

export const metadata: Metadata = {
  title: "Go-Kart",
  description:
    "The Team Vegavath go-kart: an in-house chassis, drivetrain and electronics build, raced at the Indian Karting Championship 20.",
  alternates: { canonical: "/projects/kart" },
  openGraph: {
    title: "Go-Kart | Team Vegavath",
    description:
      "Chassis to electronics, engineered in-house. Competed at IKC 20 in February 2020.",
  },
};

export const revalidate = 3600;

/* S60/D4. This is where the 3D kart lives now -- it came off the homepage, which
   is what satisfies tasks.md's performance gate that no canvas/WebGL loads on /.
   KartModelWrapper, not KartModelSection: the wrapper is the "use client" +
   dynamic(ssr:false) boundary, and importing the section directly from a server
   component would try to SSR an R3F <Canvas>.

   The title is ABOVE the model, not overlaid on it as the brief sketched. Three
   concrete reasons: the navbar is position:fixed at 72px so a canvas starting at
   y=0 sits partly behind it; KartModelSection is a fixed 28rem tall with the
   model centred, so an overlay lands on top of the kart at narrow widths; and
   that section has a tap-to-activate overlay for touch scroll-through, which any
   absolutely-positioned element over it would intercept. Header-then-content is
   also what every other page here does. */
export default function KartProjectPage() {
  return (
    <div style={{ background: "var(--bg-base)", color: "var(--text-primary)", overflowX: "hidden", minHeight: "100vh" }}>
      <section style={{ padding: "9rem 0 2.5rem" }}>
        <Container>
          <header>
            <p className="label-tech" style={{ color: "var(--accent)", marginBottom: "0.75rem" }}>
              Team Vegavath · Automotives
            </p>
            <h1 className="heading" style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Go-Kart
            </h1>
          </header>
        </Container>
      </section>

      <section style={{ paddingBottom: "4rem" }}>
        <Container>
          <KartModelWrapper />
        </Container>
      </section>

      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Reveal>
            <h2 className="heading" style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
              Specifications
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Engine", "TBD"],
                  ["Chassis", "TBD"],
                  ["Drivetrain", "TBD"],
                  ["Top Speed", "TBD"],
                  ["Weight", "TBD"],
                  ["Wheelbase", "TBD"],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: "1px solid var(--border)" }}>
                    <th
                      scope="row"
                      className="mono"
                      style={{ padding: "0.875rem 0", fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", width: "40%", textAlign: "left" }}
                    >
                      {label}
                    </th>
                    <td style={{ padding: "0.875rem 0", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* These are hardcoded placeholders. There is no `projects` table and
                no admin form behind them -- filling them in means editing this
                file, or a migration plus a service function if they should
                become editable. Saying "update via /admin" would be a lie. */}
            <p className="mono" style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "1rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Specs to be filled by the automotive team
            </p>
          </Reveal>
        </Container>
      </section>

      <section style={{ padding: "3rem 0", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Reveal>
            <h2 className="heading" style={{ fontSize: "1.25rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
              Competition history
            </h2>
            <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: "1.5rem" }}>
              <p className="mono" style={{ fontSize: "0.7rem", color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                Feb 2020
              </p>
              <h3 className="heading" style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                Indian Karting Championship 20
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Team Vegavath&apos;s competitive debut at IKC 20, running the
                go-kart built entirely in-house by the team.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section style={{ padding: "2rem 0 4rem", borderTop: "1px solid var(--border)" }}>
        <Container>
          <Link href="/projects" className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            ← All projects
          </Link>
        </Container>
      </section>
    </div>
  );
}

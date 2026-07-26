import type { Metadata } from "next";

import F1Paused from "@/components/f1/F1Paused";
import { F1Empty, F1Section, F1Table } from "@/components/f1/F1Table";
import { getF1AllCircuits } from "@/lib/services/f1";
import { getF1Enabled } from "@/lib/services/settings";

export const metadata: Metadata = {
  title: "F1 Circuits",
  description: "Formula 1 circuits on the current calendar, with location and country.",
  alternates: { canonical: "/f1/circuits" },
};

export const revalidate = 60;

export default async function F1CircuitsPage() {
  const f1Enabled = await getF1Enabled().catch(() => false);
  if (!f1Enabled) return <F1Paused />;

  const circuits = await getF1AllCircuits();

  // No "First GP" column: the circuits endpoint carries no race history, and
  // resolving it would be one extra request per circuit (78 of them) on a page
  // that already renders everything. The Wikipedia link covers it.
  return (
    <>
      <header style={{ marginBottom: "3rem" }}>
        <h1
          className="heading"
          style={{
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          Circuits
        </h1>
      </header>

      <F1Section
        title="Championship Circuits"
        subtitle={`${circuits.length} tracks that have hosted a world championship race`}
      >
        <F1Table headers={["Circuit", "Location", "Country", "Reference"]}>
          {circuits.length > 0 ? (
            circuits.map((circuit) => (
              <tr key={circuit.circuitId}>
                <td className="f1-name">{circuit.circuitName}</td>
                <td>{circuit.Location.locality}</td>
                <td>{circuit.Location.country}</td>
                <td className="f1-num">
                  <a href={circuit.url} target="_blank" rel="noreferrer">
                    Wikipedia ↗
                  </a>
                </td>
              </tr>
            ))
          ) : (
            <F1Empty colSpan={4} message="Circuit list unavailable" />
          )}
        </F1Table>
      </F1Section>
    </>
  );
}

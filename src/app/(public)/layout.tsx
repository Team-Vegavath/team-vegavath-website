import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getAllSettings } from "@/lib/services/settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getAllSettings().catch(() => null);

  if (settings?.maintenance_mode) {
    return (
      <div
        className="pattern-speed-lines"
        style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "0 1.5rem" }}
      >
        <div className="mx-auto" style={{ width: "100%", maxWidth: "42rem", textAlign: "center" }}>
          <p className="mono" style={{ fontSize: "0.8rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--accent)" }}>
            Scheduled maintenance
          </p>
          <h1 className="heading" style={{ marginTop: "1.25rem", fontSize: "clamp(1.75rem, 5vw, 2.75rem)", fontWeight: 700, color: "var(--text-primary)" }}>
            {"We'll be right back"}
          </h1>
          <p className="mx-auto" style={{ marginTop: "1rem", maxWidth: "36rem", fontSize: "1rem", color: "var(--text-secondary)" }}>
            {settings.maintenance_message || "We are updating the site. Check back soon."}
          </p>
          <p className="mono" style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Team Vegavath</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="w-full">{children}</main>
      <Footer settings={settings} />
    </>
  );
}

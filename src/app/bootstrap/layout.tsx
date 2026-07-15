export default function BootstrapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100svh", background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {children}
    </div>
  );
}

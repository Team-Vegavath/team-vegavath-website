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
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="mx-auto w-full max-w-2xl text-center text-zinc-900">
          <p className="text-6xl" aria-hidden="true">
            🔧
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">{"We'll be right back"}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-700 sm:text-lg">
            {settings.maintenance_message || "We are updating the site. Check back soon."}
          </p>
          <p className="mt-6 text-sm text-zinc-500">— Team Vegavath</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="h-20" />
      <main className="w-full">{children}</main>
      <Footer settings={settings} />
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getAllSettings } from "@/lib/services/settings";
import SettingsForm from "@/components/admin/SettingsForm";
import type { SiteSettings } from "@/types/settings";

export const metadata: Metadata = {
  title: "Settings",
};

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS: SiteSettings = {
  recruitment_open: false,
  maintenance_mode: false,
  f1_enabled: false,
  maintenance_message: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  instagram_url: "",
  linkedin_url: "",
  github_url: "",
};

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  let settings: SiteSettings = DEFAULT_SETTINGS;

  try {
    settings = await getAllSettings();
  } catch {
    settings = DEFAULT_SETTINGS;
  }

  return (
    <>
      <header className="admin-page-header">
        <h1 className="admin-page-title">Settings</h1>
      </header>

      {/* S58: the Recent Applications table that used to sit below this form was
          removed. /admin/applications is the canonical view. A viewer has nothing
          writable here, so it gets the notice instead of a blank page. */}
      {!session.user.isViewer ? (
        <div style={{ maxWidth: "52rem", marginBottom: "2rem" }}>
          <SettingsForm settings={settings} />
        </div>
      ) : (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Site settings are read-only for viewer accounts.
        </p>
      )}
    </>
  );
}

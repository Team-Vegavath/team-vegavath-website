import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AnnouncementForm from "@/components/admin/AnnouncementForm";
import AnnouncementsTable from "@/components/admin/AnnouncementsTable";
import { auth } from "@/lib/auth";
import { getAnnouncements } from "@/lib/services/announcements";
import type { Announcement } from "@/types/announcement";

export const metadata: Metadata = {
  title: "Announcements",
};

export const dynamic = "force-dynamic";

// Same shape as /admin/sponsors: isAdmin to enter (viewers included, that is
// what isAdmin means), and every write path gated on !isViewer -- the create
// form here, and the EDIT/DELETE actions inside AnnouncementsTable.
export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { new: newMode } = await searchParams;
  const isViewer = session.user.isViewer;

  if (newMode === "true" && !isViewer) {
    return (
      <div style={{ maxWidth: "52rem" }}>
        <Link href="/admin/announcements" className="admin-back-link">
          ← Back to announcements
        </Link>

        <div style={{ marginTop: "1rem" }}>
          <AdminPageHeader title="New Announcement" />
        </div>

        <AnnouncementForm mode="create" />
      </div>
    );
  }

  const announcements = await getAnnouncements().catch(() => [] as Announcement[]);
  const activeCount = announcements.filter((a) => a.is_active).length;

  return (
    <>
      <AdminPageHeader
        title="Announcements"
        subtitle={`${announcements.length} total · ${activeCount} active`}
        action={
          !isViewer ? (
            <Link
              href="/admin/announcements?new=true"
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.75rem" }}
            >
              ADD ANNOUNCEMENT
            </Link>
          ) : null
        }
      />

      {/* The homepage renders ONE announcement: the lowest-ordered active row.
          Saying so here is cheaper than making the table enforce it. */}
      {activeCount > 1 ? (
        <p className="admin-hint" style={{ marginBottom: "1rem" }}>
          {activeCount} announcements are active. The homepage shows only the
          lowest-ordered one.
        </p>
      ) : null}

      <AnnouncementsTable announcements={announcements} isViewer={isViewer} />
    </>
  );
}

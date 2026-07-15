import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import DeleteEventButton from "@/components/admin/DeleteEventButton";
import EventForm from "@/components/admin/EventForm";
import ToggleEventStatusButton from "@/components/admin/ToggleEventStatusButton";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export const metadata: Metadata = {
  title: "Edit Event",
};

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.isAdmin) {
    redirect("/admin");
  }

  const { id } = await params;
  const rows = await sql`SELECT * FROM events WHERE id = ${id} LIMIT 1`;

  if (rows.length === 0) {
    notFound();
  }

  const event = rows[0]!;
  const formattedDate = event.event_date
    ? new Date(event.event_date as string).toISOString().slice(0, 10)
    : "";

  return (
    <div style={{ maxWidth: "52rem" }}>
      <Link href="/admin/events" className="admin-back-link">
        ← Back to events
      </Link>

      <header className="admin-page-header" style={{ marginTop: "1rem" }}>
        <h1 className="admin-page-title">Edit Event</h1>
        <ToggleEventStatusButton id={event.id as string} currentStatus={event.status as string} />
      </header>

      <EventForm
        mode="edit"
        initialData={{
          id: event.id,
          title: event.title,
          slug: event.slug,
          category: event.category,
          status: event.status,
          description: event.description,
          event_date: formattedDate,
          registration_open: event.registration_open,
          registration_form_url: event.registration_form_url,
          logo_url: event.logo_url,
          cover_image_url: event.cover_image_url,
        }}
      />

      <section className="admin-danger-zone">
        <p className="admin-danger-title">Danger Zone</p>
        <p className="admin-danger-text">
          Archiving hides the event from the public site but keeps its data. Permanent
          deletion removes it forever and cannot be undone.
        </p>
        <DeleteEventButton id={event.id as string} title={event.title as string} />
      </section>
    </div>
  );
}

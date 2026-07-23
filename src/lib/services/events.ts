import { sql } from "@/lib/db";
import type { Event, CreateEventInput, UpdateEventInput } from "@/types/event";

export async function getEvents(options?: {
  status?: "upcoming" | "past" | "archived";
  limit?: number;
}): Promise<Event[]> {
  const limit = options?.limit ?? 20;

  if (options?.status) {
    const status = options.status;
    const rows = await sql`
      SELECT * FROM events
      WHERE status = ${status}
      ORDER BY event_date DESC
      LIMIT ${limit}`;
    return rows as Event[];
  }

  const rows = await sql`
    SELECT * FROM events
    ORDER BY event_date DESC
    LIMIT ${limit}`;
  return rows as Event[];
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const rows = await sql`
    SELECT * FROM events WHERE slug = ${slug} LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

export async function getEventById(id: string): Promise<Event | null> {
  const rows = await sql`SELECT * FROM events WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Event) ?? null;
}

export async function getUpcomingEvents(limit = 3): Promise<Event[]> {
  const rows = await sql`
    SELECT * FROM events
    WHERE status = 'upcoming'
    ORDER BY event_date ASC
    LIMIT ${limit}`;
  return rows as Event[];
}

export async function getPastEvents(limit = 20): Promise<Event[]> {
  const rows = await sql`
    SELECT * FROM events
    WHERE status = 'past'
    ORDER BY event_date DESC
    LIMIT ${limit}`;
  return rows as Event[];
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const rows = await sql`
    INSERT INTO events (
      slug, title, category, status, description,
      event_date, logo_url, cover_image_url,
      registration_open, registration_form_url, sponsors
    ) VALUES (
      ${input.slug}, ${input.title}, ${input.category}, ${input.status},
      ${input.description ?? null}, ${input.event_date},
      ${input.logo_url ?? null}, ${input.cover_image_url ?? null},
      ${input.registration_open}, ${input.registration_form_url ?? null},
      ${JSON.stringify(input.sponsors ?? [])}
    ) RETURNING *`;
  return rows[0] as Event;
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput
): Promise<Event | null> {
  const rows = await sql`
    UPDATE events SET
      title = COALESCE(${input.title ?? null}, title),
      category = COALESCE(${input.category ?? null}, category),
      status = COALESCE(${input.status ?? null}, status),
      description = COALESCE(${input.description ?? null}, description),
      event_date = COALESCE(${input.event_date ?? null}, event_date),
      logo_url = COALESCE(${input.logo_url ?? null}, logo_url),
      cover_image_url = COALESCE(${input.cover_image_url ?? null}, cover_image_url),
      registration_open = COALESCE(${input.registration_open ?? null}, registration_open),
      registration_form_url = COALESCE(${input.registration_form_url ?? null}, registration_form_url),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *`;
  return (rows[0] as Event) ?? null;
}

export async function archiveEvent(id: string): Promise<void> {
  await sql`
    UPDATE events SET status = 'archived', updated_at = now()
    WHERE id = ${id}`;
}

export async function deleteEvent(id: string): Promise<void> {
  await sql`DELETE FROM events WHERE id = ${id}`;
}
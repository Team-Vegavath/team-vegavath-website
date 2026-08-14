import { sql } from "@/lib/db";
import type {
  Announcement,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "@/types/announcement";

/** Admin list. LIMIT per the architecture contract; the admin panel is never
 *  going to hold 50 announcements, and an unbounded list query is the thing
 *  the rule exists to prevent. */
export async function getAnnouncements(): Promise<Announcement[]> {
  const rows = await sql`
    SELECT * FROM announcements
    ORDER BY display_order ASC, created_at DESC
    LIMIT 50`;
  return rows as Announcement[];
}

/** Singular, not plural: 73A-2 decision 11 settled on a single active slot, so
 *  the homepage renders the FIRST active row and nothing else. LIMIT 1 here is
 *  what enforces that, not the admin table -- the DB does not stop two rows
 *  being active at once. */
export async function getActiveAnnouncement(): Promise<Announcement | null> {
  const rows = await sql`
    SELECT * FROM announcements
    WHERE is_active = true
    ORDER BY display_order ASC
    LIMIT 1`;
  return (rows[0] as Announcement) ?? null;
}

export async function getAnnouncementById(
  id: string
): Promise<Announcement | null> {
  const rows = await sql`SELECT * FROM announcements WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Announcement) ?? null;
}

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<Announcement> {
  const rows = await sql`
    INSERT INTO announcements (
      title, body, image_url_desktop, image_url_mobile,
      cta_label, cta_href, is_active, display_order
    ) VALUES (
      ${input.title}, ${input.body ?? null},
      ${input.image_url_desktop ?? null}, ${input.image_url_mobile ?? null},
      ${input.cta_label ?? null}, ${input.cta_href ?? null},
      ${input.is_active}, ${input.display_order}
    ) RETURNING *`;
  return rows[0] as Announcement;
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<Announcement> {
  // Read-then-write rather than COALESCE-per-column, copying posts.ts and
  // deliberately NOT sponsors.ts. Every nullable field here is one the admin
  // must be able to CLEAR -- remove an image, drop the CTA -- and
  // COALESCE(${x ?? null}, col) can never write a NULL back. `undefined` means
  // "field absent, leave alone"; an explicit null means "clear it". Admin CRUD
  // is low-volume, so the extra SELECT is cheap.
  const current = await getAnnouncementById(id);
  if (!current) throw new Error("Announcement not found");

  const merged: CreateAnnouncementInput = {
    title: input.title ?? current.title,
    body: input.body !== undefined ? input.body : current.body,
    image_url_desktop:
      input.image_url_desktop !== undefined
        ? input.image_url_desktop
        : current.image_url_desktop,
    image_url_mobile:
      input.image_url_mobile !== undefined
        ? input.image_url_mobile
        : current.image_url_mobile,
    cta_label:
      input.cta_label !== undefined ? input.cta_label : current.cta_label,
    cta_href: input.cta_href !== undefined ? input.cta_href : current.cta_href,
    is_active: input.is_active ?? current.is_active,
    display_order: input.display_order ?? current.display_order,
  };

  const rows = await sql`
    UPDATE announcements SET
      title = ${merged.title},
      body = ${merged.body},
      image_url_desktop = ${merged.image_url_desktop},
      image_url_mobile = ${merged.image_url_mobile},
      cta_label = ${merged.cta_label},
      cta_href = ${merged.cta_href},
      is_active = ${merged.is_active},
      display_order = ${merged.display_order},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *`;
  return rows[0] as Announcement;
}

export async function toggleAnnouncementActive(
  id: string,
  is_active: boolean
): Promise<void> {
  await sql`
    UPDATE announcements
    SET is_active = ${is_active}, updated_at = now()
    WHERE id = ${id}`;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await sql`DELETE FROM announcements WHERE id = ${id}`;
}

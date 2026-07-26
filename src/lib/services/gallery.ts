import { sql } from "@/lib/db";
import type { GalleryItem, CreateGalleryItemInput } from "@/types/gallery";

type GalleryEventFilter = {
  event_id: string | null;
  event_label: string;
};

// S52B: the unbounded getGalleryItems() twin was deleted. It differed from
// this function only by having no LIMIT, and the public /gallery page was the
// one caller using it -- a direct violation of the every-list-query-has-a-LIMIT
// contract on the heaviest public page. One function, always bounded.
export async function getGalleryItemsLimited(limit = 30): Promise<GalleryItem[]> {
  const rows = await sql`
    SELECT * FROM gallery_items
    ORDER BY display_order ASC, created_at DESC
    LIMIT ${limit}`;
  return rows as GalleryItem[];
}

export async function getGalleryByEvent(eventId: string): Promise<GalleryItem[]> {
  const rows = await sql`
    SELECT * FROM gallery_items
    WHERE event_id = ${eventId}
    ORDER BY display_order ASC`;
  return rows as GalleryItem[];
}

export async function getGalleryEvents(): Promise<GalleryEventFilter[]> {
  const rows = await sql`
    SELECT DISTINCT event_id, event_label
    FROM gallery_items
    ORDER BY event_label ASC`;
  return rows as GalleryEventFilter[];
}

export async function createGalleryItem(
  input: CreateGalleryItemInput
): Promise<GalleryItem> {
  const rows = await sql`
    INSERT INTO gallery_items (
      event_id, event_label, type, url,
      thumbnail_url, caption, taken_at, display_order
    ) VALUES (
      ${input.event_id ?? null}, ${input.event_label}, ${input.type}, ${input.url},
      ${input.thumbnail_url ?? null}, ${input.caption ?? null},
      ${input.taken_at ?? null}, ${input.display_order}
    ) RETURNING *`;
  return rows[0] as GalleryItem;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await sql`DELETE FROM gallery_items WHERE id = ${id}`;
}
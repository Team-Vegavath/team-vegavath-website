import { sql } from "@/lib/db";
import type { Sponsor, CreateSponsorInput, UpdateSponsorInput } from "@/types/sponsor";

export async function getSponsors(): Promise<Sponsor[]> {
  const rows = await sql`
    SELECT * FROM sponsors
    ORDER BY display_order ASC`;
  return rows as Sponsor[];
}

export async function getActiveSponsors(): Promise<Sponsor[]> {
  const rows = await sql`
    SELECT * FROM sponsors
    WHERE is_active = true
    ORDER BY display_order ASC`;
  return rows as Sponsor[];
}

export async function getSponsorById(id: string): Promise<Sponsor | null> {
  const rows = await sql`SELECT * FROM sponsors WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Sponsor) ?? null;
}

export async function createSponsor(
  input: CreateSponsorInput
): Promise<Sponsor> {
  const rows = await sql`
    INSERT INTO sponsors (
      name, logo_url, website_url, description,
      tier, is_active, display_order
    ) VALUES (
      ${input.name}, ${input.logo_url}, ${input.website_url ?? null},
      ${input.description ?? null}, ${input.tier},
      ${input.is_active}, ${input.display_order}
    ) RETURNING *`;
  return rows[0] as Sponsor;
}

export async function updateSponsor(
  id: string,
  input: UpdateSponsorInput
): Promise<Sponsor | null> {
  const rows = await sql`
    UPDATE sponsors SET
      name = COALESCE(${input.name ?? null}, name),
      logo_url = COALESCE(${input.logo_url ?? null}, logo_url),
      website_url = COALESCE(${input.website_url ?? null}, website_url),
      description = COALESCE(${input.description ?? null}, description),
      tier = COALESCE(${input.tier ?? null}, tier),
      is_active = COALESCE(${input.is_active ?? null}, is_active),
      display_order = COALESCE(${input.display_order ?? null}, display_order)
    WHERE id = ${id}
    RETURNING *`;
  return (rows[0] as Sponsor) ?? null;
}

export async function toggleSponsorActive(
  id: string,
  is_active: boolean
): Promise<void> {
  await sql`
    UPDATE sponsors SET is_active = ${is_active} WHERE id = ${id}`;
}

export async function deleteSponsor(id: string): Promise<void> {
  await sql`DELETE FROM sponsors WHERE id = ${id}`;
}
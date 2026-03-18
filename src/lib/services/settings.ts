import { sql } from "@/lib/db";
import type { SiteSetting, SiteSettings } from "@/types/settings";

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql`
    SELECT value FROM site_settings WHERE key = ${key}`;
  return (rows[0] as { value: string } | undefined)?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = now()`;
}

export async function getAllSettings(): Promise<SiteSettings> {
  const rows = await sql`SELECT key, value FROM site_settings`;
  const map = Object.fromEntries(
    (rows as SiteSetting[]).map((r) => [r.key, r.value])
  );

  return {
    recruitment_open: map["recruitment_open"] === "true",
    maintenance_mode: map["maintenance_mode"] === "true",
    maintenance_message: map["maintenance_message"] ?? "",
    contact_email: map["contact_email"] ?? "",
    contact_phone: map["contact_phone"] ?? "",
    contact_address: map["contact_address"] ?? "",
    instagram_url: map["instagram_url"] ?? "",
    linkedin_url: map["linkedin_url"] ?? "",
    github_url: map["github_url"] ?? "",
  };
}
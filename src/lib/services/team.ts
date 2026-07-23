import { sql } from "@/lib/db";
import type { TeamMember, CreateMemberInput, UpdateMemberInput } from "@/types/member";

export async function getMembers(): Promise<TeamMember[]> {
  const rows = await sql`
    SELECT * FROM team_members
    WHERE is_active = true
    ORDER BY tier, display_order ASC`;
  return rows as TeamMember[];
}

export async function getMembersByTier(
  tier: "core" | "crew" | "legacy"
): Promise<TeamMember[]> {
  const rows = await sql`
    SELECT * FROM team_members
    WHERE tier = ${tier} AND is_active = true
    ORDER BY display_order ASC`;
  return rows as TeamMember[];
}

export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  const rows = await sql`SELECT * FROM team_members WHERE id = ${id} LIMIT 1`;
  return (rows[0] as TeamMember) ?? null;
}

export async function createMember(input: CreateMemberInput): Promise<TeamMember> {
  const rows = await sql`
    INSERT INTO team_members (
      name, role, tier, domain, quote,
      linkedin_url, github_url, photo_url, display_order, is_active
    ) VALUES (
      ${input.name}, ${input.role}, ${input.tier},
      ${input.domain ?? null}, ${input.quote ?? null},
      ${input.linkedin_url ?? null}, ${input.github_url ?? null}, ${input.photo_url ?? null}, ${input.display_order}, ${input.is_active}
    ) RETURNING *`;
  return rows[0] as TeamMember;
}

export async function createMembersBulk(
  inputs: CreateMemberInput[]
): Promise<{ inserted: number; skipped: number }> {
  if (inputs.length === 0) return { inserted: 0, skipped: 0 };

  // team_members has no unique constraint on name (001_initial_schema.sql),
  // so ON CONFLICT (name) would throw — dedupe by pre-checking existing names.
  const existing = await sql`SELECT name FROM team_members`;
  const existingNames = new Set(existing.map((row) => (row as { name: string }).name));

  const fresh = inputs.filter((m) => !existingNames.has(m.name));
  if (fresh.length === 0) return { inserted: 0, skipped: inputs.length };

  const values = fresh
    .map((_, i) => {
      const base = i * 10;
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`;
    })
    .join(",");

  const params = fresh.flatMap((m) => [
    m.name,
    m.role,
    m.tier,
    m.domain ?? null,
    m.quote ?? null,
    m.linkedin_url ?? null,
    m.github_url ?? null,
    m.photo_url ?? null,
    m.display_order ?? 0,
    m.is_active ?? true,
  ]);

  // Neon driver v1 only allows parameterized (non-template) calls via .query()
  const result = await sql.query(
    `INSERT INTO team_members
       (name, role, tier, domain, quote, linkedin_url, github_url, photo_url, display_order, is_active)
     VALUES ${values}
     RETURNING id`,
    params
  );

  return {
    inserted: result.length,
    skipped: inputs.length - result.length,
  };
}

export async function updateMember(
  id: string,
  input: UpdateMemberInput
): Promise<TeamMember | null> {
  const rows = await sql`
    UPDATE team_members SET
      name = COALESCE(${input.name ?? null}, name),
      role = COALESCE(${input.role ?? null}, role),
      tier = COALESCE(${input.tier ?? null}, tier),
      domain = COALESCE(${input.domain ?? null}, domain),
      quote = COALESCE(${input.quote ?? null}, quote),
      linkedin_url = COALESCE(${input.linkedin_url ?? null}, linkedin_url),
      github_url = COALESCE(${input.github_url ?? null}, github_url),
      photo_url = COALESCE(${input.photo_url ?? null}, photo_url),
      display_order = COALESCE(${input.display_order ?? null}, display_order)
    WHERE id = ${id}
    RETURNING *`;
  return (rows[0] as TeamMember) ?? null;
}

export async function toggleMemberActive(
  id: string,
  is_active: boolean
): Promise<void> {
  await sql`
    UPDATE team_members SET is_active = ${is_active} WHERE id = ${id}`;
}

export async function deleteMember(id: string): Promise<void> {
  await sql`DELETE FROM team_members WHERE id = ${id}`;
}
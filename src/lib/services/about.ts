import { sql } from "@/lib/db";

export type Milestone = {
  id: string;
  date_label: string;
  title: string;
  description: string;
  sort_order: number;
};

export async function getMilestones(): Promise<Milestone[]> {
  const rows = await sql`
    SELECT id, date_label, title, description, sort_order
    FROM milestones ORDER BY sort_order ASC, created_at ASC LIMIT 50`;
  return rows as Milestone[];
}

export async function createMilestone(
  dateLabel: string, title: string, description: string, sortOrder: number
) {
  return sql`INSERT INTO milestones (date_label, title, description, sort_order)
             VALUES (${dateLabel}, ${title}, ${description}, ${sortOrder})
             RETURNING *`;
}

export async function updateMilestone(
  id: string, dateLabel: string, title: string,
  description: string, sortOrder: number
) {
  return sql`UPDATE milestones SET date_label=${dateLabel}, title=${title},
             description=${description}, sort_order=${sortOrder}
             WHERE id=${id} RETURNING *`;
}

export async function deleteMilestone(id: string) {
  return sql`DELETE FROM milestones WHERE id=${id}`;
}

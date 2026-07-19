export interface TeamMember {
  id: string;
  name: string;
  role: string;
  tier: "core" | "crew" | "legacy";
  domain: "Automotive" | "Robotics" | "Design" | "Media" | "Marketing" | "Programming" | "Operations" | null;
  quote: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  photo_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export type CreateMemberInput = Omit<TeamMember, "id" | "created_at">;
export type UpdateMemberInput = Partial<CreateMemberInput>;
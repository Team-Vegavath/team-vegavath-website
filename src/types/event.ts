export interface Event {
  id: string;
  slug: string;
  title: string;
  category: "workshops" | "hackathons" | "competitions" | "talks" | "other";
  status: "upcoming" | "past" | "archived";
  description: string | null;
  event_date: string;
  logo_url: string | null;
  cover_image_url: string | null;
  registration_open: boolean;
  registration_form_url: string | null;
  sponsors: string[];
  created_at: string;
  updated_at: string;
}

export type CreateEventInput = Omit<Event, "id" | "created_at" | "updated_at">;
export type UpdateEventInput = Partial<CreateEventInput>;
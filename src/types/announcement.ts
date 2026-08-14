export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  image_url_desktop: string | null;
  image_url_mobile: string | null;
  cta_label: string | null;
  cta_href: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateAnnouncementInput = Omit<
  Announcement,
  "id" | "created_at" | "updated_at"
>;

/* Partial, and every nullable field can be sent as an explicit null to CLEAR
   it. `undefined` means "leave alone" -- that distinction is the whole reason
   updateAnnouncement reads then writes instead of using COALESCE. */
export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

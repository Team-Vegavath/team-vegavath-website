export interface SiteSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface SiteSettings {
  recruitment_open: boolean;
  maintenance_mode: boolean;
  maintenance_message: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  instagram_url: string;
  linkedin_url: string;
  github_url: string;
}

// FY26 recruitment domains — must stay in sync with JoinClient DOMAINS,
// /api/join VALID_DOMAINS, and the CHECKs in migrations/004.
export type ApplicationDomain =
  | "Coding"
  | "Automotives"
  | "Sponsorship"
  | "Robotics"
  | "Operations"
  | "Social Media";

// FY25 values still present on rows submitted before migration 004, plus
// the long FY26 name used before Session 19 shortened it to "Sponsorship".
export type LegacyApplicationDomain =
  | "Automotive"
  | "Design"
  | "Media"
  | "Marketing"
  | "Programming"
  | "Sponsorship & Finance";

// Recruitment pipeline statuses (migration 005). 'reviewed' and 'accepted'
// are pre-S19 values kept for rows already in the DB.
export const APPLICATION_STATUSES = [
  "pending",
  "shortlisted",
  "interview",
  "selected",
  "rejected",
  "reviewed",
  "accepted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: string;
  name: string;
  email: string;
  domain_interest: ApplicationDomain | LegacyApplicationDomain;
  domain_interest_2?: string | null;
  domain_interest_3?: string | null;
  portfolio_url: string | null;
  // FY26 fields (migration 004) — null on pre-FY26 rows
  mobile_number?: string | null;
  srn_prn?: string | null;
  semester?: "1" | "3" | "5" | null;
  why_join?: string | null;
  value_addition?: string | null;
  domain_experience?: string | null;
  design_portfolio_url?: string | null;
  status: ApplicationStatus;
  submitted_at: string;
}

export interface CreateApplicationInput {
  name: string;
  email: string;
  domain_interest: ApplicationDomain;
  domain_interest_2?: string | null;
  domain_interest_3?: string | null;
  portfolio_url: string | null;
  mobile_number?: string | null;
  srn_prn?: string | null;
  semester?: "1" | "3" | "5" | null;
  why_join?: string | null;
  value_addition?: string | null;
  domain_experience?: string | null;
  design_portfolio_url?: string | null;
}
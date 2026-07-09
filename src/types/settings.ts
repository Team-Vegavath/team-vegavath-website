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

export interface Application {
  id: string;
  name: string;
  email: string;
  domain_interest: "Automotive" | "Robotics" | "Design" | "Media" | "Marketing" | "Coding";
  portfolio_url: string | null;
  status: "pending" | "reviewed" | "accepted" | "rejected";
  submitted_at: string;
}

export interface CreateApplicationInput {
  name: string;
  email: string;
  domain_interest: "Automotive" | "Robotics" | "Design" | "Media" | "Marketing" | "Coding";
  portfolio_url: string | null;
}
"use client";

import { useState } from "react";

import { updateSettings } from "@/app/(admin)/admin/settings/actions";
import type { SiteSettings } from "@/types/settings";

interface SettingsFormProps {
  settings: SiteSettings;
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const [recruitmentOpen, setRecruitmentOpen] = useState(settings.recruitment_open);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenance_mode);
  const [contactEmail, setContactEmail] = useState(settings.contact_email);
  const [contactAddress, setContactAddress] = useState(settings.contact_address);
  const [instagramUrl, setInstagramUrl] = useState(settings.instagram_url);
  const [linkedinUrl, setLinkedinUrl] = useState(settings.linkedin_url);
  const [githubUrl, setGithubUrl] = useState(settings.github_url);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={async (formData) => {
        setSaving(true);
        await updateSettings(formData);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }}
      style={{ borderRadius: "0.75rem", border: "1px solid #27272a", background: "#18181b", padding: "1.5rem", boxSizing: "border-box" }}
    >
      <h2 className="mb-4 text-lg font-bold text-zinc-100">Recruitment &amp; Maintenance</h2>

      <input
        type="hidden"
        name="recruitment_open"
        value={recruitmentOpen ? "true" : "false"}
      />
      <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0.5rem", background: "#27272a", padding: "1rem" }}>
        <span className="text-sm font-medium text-zinc-200">Recruitment Open</span>
        <div
          onClick={() => setRecruitmentOpen((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            recruitmentOpen ? "bg-orange-500" : "bg-zinc-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              recruitmentOpen ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </div>
      </div>

      <input
        type="hidden"
        name="maintenance_mode"
        value={maintenanceMode ? "true" : "false"}
      />
      <div style={{ marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "0.5rem", background: "#27272a", padding: "1rem" }}>
        <span className="text-sm font-medium text-zinc-200">Maintenance Mode</span>
        <div
          onClick={() => setMaintenanceMode((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            maintenanceMode ? "bg-orange-500" : "bg-zinc-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              maintenanceMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </div>
      </div>

      <h2 className="mt-6 mb-4 text-lg font-bold text-zinc-100">Contact Information</h2>

      <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="contact_email">
        Contact Email
      </label>
      <input
        id="contact_email"
        name="contact_email"
        type="email"
        value={contactEmail}
        onChange={(event) => setContactEmail(event.target.value)}
        style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.75rem 1rem", color: "#f4f4f5", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
      />

      <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="contact_address">
        Contact Address
      </label>
      <input
        id="contact_address"
        name="contact_address"
        type="text"
        value={contactAddress}
        onChange={(event) => setContactAddress(event.target.value)}
        style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.75rem 1rem", color: "#f4f4f5", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
      />

      <h2 className="mt-6 mb-4 text-lg font-bold text-zinc-100">Social Media Links</h2>

      <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="instagram_url">
        Instagram URL
      </label>
      <input
        id="instagram_url"
        name="instagram_url"
        type="url"
        value={instagramUrl}
        onChange={(event) => setInstagramUrl(event.target.value)}
        style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.75rem 1rem", color: "#f4f4f5", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
      />

      <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="linkedin_url">
        LinkedIn URL
      </label>
      <input
        id="linkedin_url"
        name="linkedin_url"
        type="url"
        value={linkedinUrl}
        onChange={(event) => setLinkedinUrl(event.target.value)}
        style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.75rem 1rem", color: "#f4f4f5", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
      />

      <label className="mb-2 block text-sm font-medium text-zinc-300" htmlFor="github_url">
        GitHub URL
      </label>
      <input
        id="github_url"
        name="github_url"
        type="url"
        value={githubUrl}
        onChange={(event) => setGithubUrl(event.target.value)}
        style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #3f3f46", background: "#09090b", padding: "0.75rem 1rem", color: "#f4f4f5", marginBottom: "1rem", boxSizing: "border-box", outline: "none" }}
      />

      <button
        type="submit"
        disabled={saving}
        className="mt-6 w-full rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
      </button>
    </form>
  );
}
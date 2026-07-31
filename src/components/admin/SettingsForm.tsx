"use client";

import { useState } from "react";

import { updateSettings } from "@/app/(admin)/admin/settings/actions";
import { StatefulButton } from "@/components/admin/StatefulButton";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import type { SiteSettings } from "@/types/settings";

interface SettingsFormProps {
  settings: SiteSettings;
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const [recruitmentOpen, setRecruitmentOpen] = useState(settings.recruitment_open);
  const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenance_mode);
  const [f1Enabled, setF1Enabled] = useState(settings.f1_enabled);
  const [maintenanceMessage, setMaintenanceMessage] = useState(settings.maintenance_message);
  const [contactEmail, setContactEmail] = useState(settings.contact_email);
  const [contactPhone, setContactPhone] = useState(settings.contact_phone);
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
      className="admin-form"
      style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}
    >
      {/* S66: .admin-form-section adds the page-header accent tick to the rule
          .admin-section-label already draws, tying form sections to the page
          header language. */}
      <span className="admin-section-label admin-form-section">Site Status</span>

      <input type="hidden" name="recruitment_open" value={recruitmentOpen ? "true" : "false"} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Recruitment Open
        </span>
        <ToggleSwitch value={recruitmentOpen} onChange={setRecruitmentOpen} ariaLabel="Recruitment open" />
      </div>

      <input type="hidden" name="maintenance_mode" value={maintenanceMode ? "true" : "false"} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Maintenance Mode
        </span>
        <ToggleSwitch value={maintenanceMode} onChange={setMaintenanceMode} ariaLabel="Maintenance mode" />
      </div>

      <input type="hidden" name="f1_enabled" value={f1Enabled ? "true" : "false"} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          F1 Stats
        </span>
        <ToggleSwitch value={f1Enabled} onChange={setF1Enabled} ariaLabel="F1 stats pages enabled" />
      </div>
      <p className="admin-hint" style={{ marginTop: "-1rem" }}>
        Off pauses every call to the external F1 data API. Turn it off during
        race weekends if the site is getting heavy traffic.
      </p>

      <div>
        <label htmlFor="maintenance_message" className="admin-label">
          Maintenance Message
        </label>
        <textarea
          id="maintenance_message"
          name="maintenance_message"
          rows={3}
          value={maintenanceMessage}
          onChange={(event) => setMaintenanceMessage(event.target.value)}
          placeholder="Shown on the public site while maintenance mode is on"
          className="admin-input"
        />
      </div>

      <span className="admin-section-label admin-form-section">Contact</span>

      <div>
        <label htmlFor="contact_email" className="admin-label">
          Contact Email
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="contact_phone" className="admin-label">
          Contact Phone
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          type="text"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="contact_address" className="admin-label">
          Contact Address
        </label>
        <input
          id="contact_address"
          name="contact_address"
          type="text"
          value={contactAddress}
          onChange={(event) => setContactAddress(event.target.value)}
          className="admin-input"
        />
      </div>

      <span className="admin-section-label admin-form-section">Social Media</span>

      <div>
        <label htmlFor="instagram_url" className="admin-label">
          Instagram URL
        </label>
        <input
          id="instagram_url"
          name="instagram_url"
          type="url"
          value={instagramUrl}
          onChange={(event) => setInstagramUrl(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="linkedin_url" className="admin-label">
          LinkedIn URL
        </label>
        <input
          id="linkedin_url"
          name="linkedin_url"
          type="url"
          value={linkedinUrl}
          onChange={(event) => setLinkedinUrl(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="github_url" className="admin-label">
          GitHub URL
        </label>
        <input
          id="github_url"
          name="github_url"
          type="url"
          value={githubUrl}
          onChange={(event) => setGithubUrl(event.target.value)}
          className="admin-input"
        />
      </div>

      {/* S63: the only form whose success state is actually visible -- the
          others navigate away on save. The separate SAVED tick that used to sit
          below this button is gone: it fired off the same `saved` flag, in the
          same spot, three seconds long. The button says it now. */}
      <StatefulButton
        state={saving ? "loading" : saved ? "success" : "idle"}
        style={{ width: "100%" }}
      >
        SAVE CHANGES
      </StatefulButton>
    </form>
  );
}

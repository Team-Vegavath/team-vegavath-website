"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FileUploadField from "@/components/admin/FileUploadField";
import ToggleSwitch from "@/components/admin/ToggleSwitch";

interface SponsorFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    name?: string;
    tier?: string;
    website_url?: string;
    description?: string;
    display_order?: number;
    is_active?: boolean;
    logo_url?: string | null;
  };
}

export default function SponsorForm({ mode, initialData }: SponsorFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [tier, setTier] = useState(initialData?.tier ?? "community");
  const [website_url, setWebsiteUrl] = useState(initialData?.website_url ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [display_order, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  const [is_active, setIsActive] = useState(initialData?.is_active ?? true);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadFile(file: File, path: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Upload failed");
    }
    return data.url;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const safeName = name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      let logo_url: string | undefined;

      // Timestamped key: R2 serves immutable cache headers, never reuse a key.
      if (logoFiles[0]) {
        logo_url = await uploadFile(logoFiles[0], `sponsors/${safeName}-${Date.now()}.png`);
      }

      const sponsorFields = {
        name,
        tier,
        website_url,
        description,
        display_order,
        is_active,
        logo_url,
      };

      const isEdit = mode === "edit" && Boolean(initialData?.id);
      const payload = isEdit ? { id: initialData?.id, ...sponsorFields } : sponsorFields;

      const res = await fetch("/api/admin/sponsors", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save sponsor");
      }

      router.push("/admin/sponsors");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Something went wrong";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form" style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
      <span className="admin-section-label">Basic Info</span>

      <div>
        <label htmlFor="name" className="admin-label">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="tier" className="admin-label">
          Tier
        </label>
        <select
          id="tier"
          value={tier}
          onChange={(event) => setTier(event.target.value)}
          className="admin-input"
        >
          <option value="premium">Premium</option>
          <option value="community">Community</option>
        </select>
      </div>

      <div>
        <label htmlFor="website_url" className="admin-label">
          Website URL
        </label>
        <input
          id="website_url"
          type="url"
          value={website_url}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          placeholder="https://sponsor-website.com · optional"
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="description" className="admin-label">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          placeholder="Brief description shown in sponsor carousel · optional"
          className="admin-input"
        />
      </div>

      <span className="admin-section-label">Media</span>

      <div>
        <span className="admin-label">Logo</span>
        <FileUploadField
          id="logo"
          accept="image/*,image/svg+xml"
          files={logoFiles}
          onFilesChange={setLogoFiles}
          currentUrl={initialData?.logo_url}
          hint="PNG or SVG recommended"
        />
      </div>

      <span className="admin-section-label">Status &amp; Visibility</span>

      <div>
        <label htmlFor="display_order" className="admin-label">
          Display Order
        </label>
        <input
          id="display_order"
          type="number"
          value={display_order}
          onChange={(event) => setDisplayOrder(Number(event.target.value) || 0)}
          className="admin-input"
        />
        <p className="admin-hint">Lower number = appears first</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Active
        </span>
        <ToggleSwitch value={is_active} onChange={setIsActive} ariaLabel="Sponsor active" />
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <button type="submit" disabled={saving} className="btn-primary" style={{ width: "100%", opacity: saving ? 0.6 : 1 }}>
        {saving ? "SAVING…" : "SAVE SPONSOR"}
      </button>
    </form>
  );
}

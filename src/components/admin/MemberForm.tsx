"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FileUploadField from "@/components/admin/FileUploadField";
import { StatefulButton } from "@/components/admin/StatefulButton";
import ToggleSwitch from "@/components/admin/ToggleSwitch";

interface MemberFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    name?: string;
    role?: string;
    tier?: string;
    domain?: string;
    quote?: string;
    linkedin_url?: string;
    github_url?: string;
    display_order?: number;
    is_active?: boolean;
    photo_url?: string | null;
  };
}

export default function MemberForm({ mode, initialData }: MemberFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? "");
  const [role, setRole] = useState(initialData?.role ?? "");
  const [tier, setTier] = useState(initialData?.tier ?? "core");
  const [domain, setDomain] = useState(initialData?.domain ?? "Automotive");
  const [quote, setQuote] = useState(initialData?.quote ?? "");
  const [linkedin_url, setLinkedinUrl] = useState(initialData?.linkedin_url ?? "");
  const [github_url, setGithubUrl] = useState(initialData?.github_url ?? "");
  const [display_order, setDisplayOrder] = useState(initialData?.display_order ?? 0);
  const [is_active, setIsActive] = useState(initialData?.is_active ?? true);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
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
      const safeName = name.toLowerCase().replace(/\s+/g, "-");

      // Only include photo_url when a new file was uploaded; sending "" on
      // edit would wipe the stored URL (same COALESCE trap EventForm had).
      // Timestamped key: R2 serves immutable cache headers, never reuse a key.
      const imageFields: { photo_url?: string } = {};

      if (photoFiles[0]) {
        imageFields.photo_url = await uploadFile(
          photoFiles[0],
          `team/${tier}/${safeName}-${Date.now()}.jpg`,
        );
      }

      const payload = {
        id: initialData?.id,
        name,
        role,
        tier,
        domain,
        quote,
        linkedin_url,
        github_url,
        display_order,
        is_active,
        ...imageFields,
      };

      const method = mode === "edit" && initialData?.id ? "PATCH" : "POST";

      const res = await fetch("/api/admin/team", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          data && typeof data.error === "string" ? data.error : "Failed to save member";
        throw new Error(message);
      }

      router.push("/admin/team");
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
        <label htmlFor="role" className="admin-label">
          Role
        </label>
        <input
          id="role"
          type="text"
          required
          value={role}
          onChange={(event) => setRole(event.target.value)}
          placeholder="e.g. Club Head, Design Lead, Member"
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
          <option value="core">core</option>
          <option value="crew">crew</option>
          <option value="legacy">legacy</option>
        </select>
      </div>

      <div>
        <label htmlFor="domain" className="admin-label">
          Domain
        </label>
        <select
          id="domain"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          className="admin-input"
        >
          <option value="Automotive">Automotive</option>
          <option value="Robotics">Robotics</option>
          <option value="Design">Design</option>
          <option value="Media">Media</option>
          <option value="Marketing">Marketing</option>
          <option value="Programming">Programming</option>
          <option value="Operations">Operations</option>
        </select>
      </div>

      <span className="admin-section-label">Profile</span>

      <div>
        <label htmlFor="quote" className="admin-label">
          Quote
        </label>
        <textarea
          id="quote"
          rows={4}
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          placeholder="Their personal quote · optional"
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="linkedin_url" className="admin-label">
          LinkedIn URL
        </label>
        <input
          id="linkedin_url"
          type="url"
          value={linkedin_url}
          onChange={(event) => setLinkedinUrl(event.target.value)}
          placeholder="https://linkedin.com/in/username · optional"
          className="admin-input"
        />
        <p className="admin-hint">Shows the LinkedIn icon on /crew when set</p>
      </div>

      <div>
        <label htmlFor="github_url" className="admin-label">
          GITHUB URL
        </label>
        <input
          id="github_url"
          type="url"
          value={github_url}
          onChange={(event) => setGithubUrl(event.target.value)}
          placeholder="https://github.com/username"
          className="admin-input"
        />
        <p className="admin-hint">Shows the GitHub icon on /crew when set</p>
      </div>

      <span className="admin-section-label">Media</span>

      <div>
        <span className="admin-label">Photo</span>
        <FileUploadField
          id="photo"
          accept="image/*"
          files={photoFiles}
          onFilesChange={setPhotoFiles}
          currentUrl={initialData?.photo_url}
          hint="Square crop preferred · optional, can be added later"
          uploading={saving}
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
          onChange={(event) => setDisplayOrder(Number(event.target.value))}
          className="admin-input"
        />
        <p className="admin-hint">Lower number = appears first within tier</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Active
        </span>
        <ToggleSwitch value={is_active} onChange={setIsActive} ariaLabel="Member active" />
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      {/* No success state: handleSubmit navigates to /admin/team on success. */}
      <StatefulButton
        state={saving ? "loading" : error ? "error" : "idle"}
        style={{ width: "100%" }}
      >
        SAVE MEMBER
      </StatefulButton>
    </form>
  );
}

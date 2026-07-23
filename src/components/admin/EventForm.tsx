"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import FileUploadField from "@/components/admin/FileUploadField";
import ToggleSwitch from "@/components/admin/ToggleSwitch";
import { isNoRegistrationEvent } from "@/lib/utils";

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    slug?: string;
    category?: string;
    status?: string;
    description?: string;
    event_date?: string;
    registration_open?: boolean;
    registration_form_url?: string;
    logo_url?: string | null;
    cover_image_url?: string | null;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export default function EventForm({ mode, initialData }: EventFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "workshops");
  const [status, setStatus] = useState(initialData?.status ?? "upcoming");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [event_date, setEventDate] = useState(initialData?.event_date ?? "");
  const [registration_form_url, setRegistrationFormUrl] = useState(
    initialData?.registration_form_url ?? "",
  );
  const [registration_open, setRegistrationOpen] = useState(
    initialData?.registration_open ?? false,
  );

  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
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

    if (
      registration_form_url &&
      !registration_form_url.startsWith("http://") &&
      !registration_form_url.startsWith("https://")
    ) {
      setError("Registration URL must start with https://");
      return;
    }

    setSaving(true);

    try {
      // Only include image fields when a new file was uploaded; sending "" on
      // edit survives the service's COALESCE and wipes the stored URL.
      const imageFields: { logo_url?: string; cover_image_url?: string } = {};

      // R2 objects are served with immutable cache headers; replacements need
      // a new filename, so key each upload by timestamp.
      if (logoFiles[0]) {
        imageFields.logo_url = await uploadFile(logoFiles[0], `events/${slug}/logo-${Date.now()}.png`);
      }

      if (coverFiles[0]) {
        imageFields.cover_image_url = await uploadFile(coverFiles[0], `events/${slug}/cover-${Date.now()}.jpg`);
      }

      const eventFields = {
        title,
        slug,
        category,
        status,
        description,
        event_date,
        registration_open,
        registration_form_url,
        ...imageFields,
      };

      const isEdit = mode === "edit" && Boolean(initialData?.id);
      const payload = isEdit ? { id: initialData?.id, ...eventFields } : eventFields;

      const res = await fetch("/api/admin/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to save event");
      }

      router.push("/admin/events");
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
        <label htmlFor="title" className="admin-label">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (mode === "create") {
              setSlug(slugify(nextTitle));
            }
          }}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="slug" className="admin-label">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          value={slug}
          onChange={(event) => setSlug(slugify(event.target.value))}
          className="admin-input"
        />
      </div>

      <div>
        <label htmlFor="category" className="admin-label">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="admin-input"
        >
          <option value="workshops">workshops</option>
          <option value="hackathons">hackathons</option>
          <option value="competitions">competitions</option>
          <option value="talks">talks</option>
          <option value="other">other</option>
        </select>
      </div>

      <div>
        <label htmlFor="description" className="admin-label">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Supports markdown"
          rows={6}
          className="admin-input"
        />
      </div>

      <span className="admin-section-label">Schedule &amp; Status</span>

      <div>
        <label htmlFor="status" className="admin-label">
          Status
        </label>
        <select
          id="status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="admin-input"
        >
          <option value="upcoming">upcoming</option>
          <option value="past">past</option>
          <option value="archived">archived</option>
        </select>
      </div>

      <div>
        <label htmlFor="event_date" className="admin-label">
          Event Date
        </label>
        <input
          id="event_date"
          type="date"
          value={event_date}
          onChange={(event) => setEventDate(event.target.value)}
          className="admin-input"
        />
      </div>

      <span className="admin-section-label">Registration</span>

      <div>
        <label htmlFor="registration_form_url" className="admin-label">
          Registration Form URL
        </label>
        <input
          id="registration_form_url"
          type="url"
          value={registration_form_url}
          onChange={(event) => setRegistrationFormUrl(event.target.value)}
          className="admin-input"
        />
        <p className="admin-hint">Google Form link. Leave blank if not applicable.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <span className="admin-label" style={{ marginBottom: 0 }}>
          Registration Open
        </span>
        <ToggleSwitch value={registration_open} onChange={setRegistrationOpen} ariaLabel="Registration open" />
      </div>

      {isNoRegistrationEvent(slug) && (
        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          color: "var(--text-muted)",
          marginTop: "0.5rem",
        }}>
          Registration fields are hidden on the public event page for this event type.
        </p>
      )}

      <span className="admin-section-label">Media</span>

      <div>
        <span className="admin-label">Logo</span>
        <FileUploadField
          id="logo"
          accept="image/*"
          files={logoFiles}
          onFilesChange={setLogoFiles}
          currentUrl={initialData?.logo_url}
          hint="PNG preferred · optional, can be added later"
        />
      </div>

      <div>
        <span className="admin-label">Cover Image</span>
        <FileUploadField
          id="cover"
          accept="image/*"
          files={coverFiles}
          onFilesChange={setCoverFiles}
          currentUrl={initialData?.cover_image_url}
          hint="JPG preferred · optional, can be added later"
        />
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <button type="submit" disabled={saving} className="btn-primary" style={{ width: "100%", opacity: saving ? 0.6 : 1 }}>
        {saving ? "SAVING…" : "SAVE EVENT"}
      </button>
    </form>
  );
}
